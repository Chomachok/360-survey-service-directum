"""Контрактные API-тесты: соответствие ответов и ошибок их OpenAPI-описанию.

Здесь проверяется не бизнес-логика, а стабильность формата: поля DTO, формат дат,
единый вид ошибок и полнота swagger.json. Такие тесты первыми ловят «тихие»
поломки, когда бэкенд меняет форму ответа, а фронтенд продолжает ждать старую.
"""
from __future__ import annotations

import re

import jsonschema
import pytest

from helpers import (
    ADMIN_EMAIL,
    API_BASE_URL,
    RESPONDENT_EMAIL,
    ApiClient,
    message_text,
    survey_payload,
    unique_suffix,
)

pytestmark = [pytest.mark.api, pytest.mark.contract, pytest.mark.regression]

# Дата обязана содержать таймзону: без суффикса браузер читает её как локальное время.
ISO_WITH_ZONE = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$")

ID = {"type": "integer", "minimum": 1}
# Формат «год-месяц-день T часы:минуты:секунды» — таймзону проверяет отдельный тест CONTRACT-1.
DATE = {"type": "string", "pattern": r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}"}

SURVEY_DTO = {
    "type": "object",
    "properties": {
        "id": ID,
        "title": {"type": "string"},
        "description": {"type": ["string", "null"]},
        "status": {"enum": ["Draft", "Active", "Completed"]},
        "startDate": DATE,
        "endDate": DATE,
        "authorId": ID,
        "authorName": {"type": "string"},
        "targetId": {"type": ["integer", "null"]},
    },
    "required": ["id", "title", "status", "startDate", "endDate", "authorId", "authorName"],
    "additionalProperties": False,
}

QUESTION_DTO = {
    "type": "object",
    "properties": {
        "id": ID,
        "text": {"type": "string"},
        "type": {"enum": ["Text", "SingleChoice"]},
        "required": {"type": "boolean"},
        "order": ID,
        "options": {"type": ["array", "null"], "items": {"type": "string"}},
    },
    "required": ["id", "text", "type", "required", "order", "options"],
    "additionalProperties": False,
}

MATRIX_ITEM_DTO = {
    "type": "object",
    "properties": {
        "id": ID,
        "evaluatorId": ID,
        "evaluatorName": {"type": "string"},
        "targetId": ID,
        "targetName": {"type": "string"},
        "token": {"type": "string", "pattern": r"^[0-9a-f-]{36}$"},
        "completed": {"type": "boolean"},
    },
    "required": ["id", "evaluatorId", "evaluatorName", "targetId", "targetName", "token",
                 "completed"],
    "additionalProperties": False,
}

EMPLOYEE_DTO = {
    "type": "object",
    "properties": {
        "id": ID,
        "fullName": {"type": "string"},
        "email": {"type": "string"},
        "roles": {"type": "array", "items": {"enum": ["SurveyAuthor", "Respondent",
                                                      "SystemAdministrator", "Administrator"]}},
    },
    "required": ["id", "fullName", "email", "roles"],
    "additionalProperties": False,
}

VERIFY_DTO = {
    "type": "object",
    "properties": {
        "token": {"type": "string", "minLength": 20},
        "fullName": {"type": "string"},
        "isAdmin": {"type": "boolean"},
        "email": {"type": "string"},
    },
    "required": ["token", "fullName", "isAdmin", "email"],
    "additionalProperties": False,
}

PUBLIC_QUESTION_DTO = {
    "type": "object",
    "properties": {
        "id": ID,
        "text": {"type": "string"},
        "type": {"enum": ["Text", "SingleChoice"]},
        "required": {"type": "boolean"},
        "options": {"type": ["array", "null"], "items": {"type": "string"}},
    },
    "required": ["id", "text", "type", "required"],
    "additionalProperties": False,
}

PUBLIC_SURVEY_DTO = {
    "type": "object",
    "properties": {
        "surveyId": ID,
        "surveyTitle": {"type": "string"},
        "targetName": {"type": ["string", "null"]},
        "questions": {"type": "array", "items": PUBLIC_QUESTION_DTO},
    },
    "required": ["surveyId", "surveyTitle", "questions"],
}

RESULTS_DTO = {
    "type": "object",
    "properties": {
        "surveyId": ID,
        "surveyTitle": {"type": "string"},
        "results": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "employeeId": ID,
                    "employeeName": {"type": "string"},
                    "evaluators": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "evaluatorId": ID,
                                "evaluatorName": {"type": "string"},
                                "answers": {
                                    "type": "array",
                                    "items": {
                                        "type": "object",
                                        "properties": {
                                            "questionText": {"type": "string"},
                                            "answerText": {"type": ["string", "null"]},
                                            "selectedOption": {"type": ["string", "null"]},
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
    "required": ["surveyId", "surveyTitle", "results"],
}


def validate(instance, schema, label: str) -> None:
    """Понятная ошибка валидации: jsonschema сам по себе говорит сухо."""
    try:
        jsonschema.validate(instance=instance, schema=schema)
    except jsonschema.ValidationError as exc:
        pytest.fail(f"{label}: ответ не соответствует контракту — {exc.message} "
                    f"(поле: {'/'.join(map(str, exc.absolute_path)) or '<корень>'})")


@pytest.fixture(scope="session")
def swagger(api_base_url: str) -> dict:
    response = ApiClient(api_base_url).get("/swagger/v1/swagger.json")
    assert response.status_code == 200, "без swagger.json контрактные тесты бессмысленны"
    return response.json()


class TestResponseDtoShape:
    """Полезная нагрузка эндпоинтов должна держать задокументированную форму."""

    @pytest.mark.smoke
    def test_survey_dto_shape(self, surveys):
        validate(surveys.draft(title="Контракт формы опроса"), SURVEY_DTO, "POST /api/surveys")

    def test_survey_list_items_shape(self, surveys, admin_api):
        surveys.draft(title="Контракт списка опросов")
        for item in admin_api.get("/api/surveys").json():
            validate(item, SURVEY_DTO, "GET /api/surveys")

    def test_question_dto_shape(self, surveys):
        setup = surveys.ready_survey()
        for question in setup.questions:
            validate(question, QUESTION_DTO, "GET /api/questions/surveys/{id}")

    def test_matrix_item_shape(self, surveys):
        setup = surveys.ready_survey()
        for item in surveys.client.get(f"/api/surveys/{setup.survey_id}/matrix").json():
            validate(item, MATRIX_ITEM_DTO, "GET /api/surveys/{id}/matrix")

    def test_public_survey_shape(self, surveys):
        setup = surveys.ready_survey()
        body = surveys.client.get(f"/api/public/{setup.token}").json()
        validate(body, PUBLIC_SURVEY_DTO, "GET /api/public/{token}")

    def test_results_shape(self, surveys):
        setup = surveys.ready_survey()
        surveys.client.post(f"/api/public/{setup.token}/answers",
                            json={"answers": setup.answers()})
        body = surveys.client.get(f"/api/surveys/{setup.survey_id}/Results").json()
        validate(body, RESULTS_DTO, "GET /api/surveys/{id}/Results")

    def test_employees_shape(self, admin_api):
        for employee in admin_api.get("/api/employees").json():
            validate(employee, EMPLOYEE_DTO, "GET /api/employees")

    def test_verify_response_shape(self, api_base_url, mailpit):
        import datetime

        marker = datetime.datetime.now(datetime.timezone.utc)
        client = ApiClient(api_base_url)
        client.post("/api/auth/send-code", json={"email": RESPONDENT_EMAIL})
        code = mailpit.wait_for_login_code(RESPONDENT_EMAIL, since=marker)
        body = client.post("/api/auth/verify",
                           json={"email": RESPONDENT_EMAIL, "code": code}).json()
        validate(body, VERIFY_DTO, "POST /api/auth/verify")
        client.close()

    def test_enum_values_match_openapi(self, swagger, surveys, admin_api):
        """Значения статусов/типов/ролей в ответах совпадают с enum из swagger."""
        enums = {name: sch["enum"] for name, sch in swagger["components"]["schemas"].items()
                 if "enum" in sch}
        assert set(enums) == {"QuestionType", "EmployeeRole"}, "в контракте описано ровно два enum"

        survey = surveys.draft(title="Контракт enum")
        assert survey["status"] in {"Draft", "Active", "Completed"}
        question = surveys.add_question(survey["id"], type="SingleChoice", options=["А", "Б"])
        assert question["type"] in enums["QuestionType"] or question["type"] is None
        for employee in admin_api.get("/api/employees").json():
            assert set(employee["roles"]) <= set(enums["EmployeeRole"])


class TestDateTimeContract:
    @pytest.mark.xfail(reason="ДЕФЕКТ CONTRACT-1: одни и те же даты в разных ответах отдаются "
                              "то с суффиксом Z, то без него (POST/PUT — «…Z», GET/publish/complete — "
                              "без таймзоны). Браузер трактует дату без суффикса как локальное время, "
                              "и календарь опроса разъезжается на часововой пояс", strict=False)
    def test_all_survey_dates_carry_a_time_zone(self, surveys):
        created = surveys.draft(title="Контракт дат")
        read = surveys.client.get(f"/api/surveys/{created['id']}").json()
        for survey in (created, read):
            for field in ("startDate", "endDate"):
                assert ISO_WITH_ZONE.match(survey[field]), \
                    f"{survey['id']}: {field}={survey[field]!r} — нет таймзоны"

    def test_created_survey_dates_are_utc_instant(self, surveys):
        """Созданный опрос обязан отдавать parse-пригодные ISO-даты (без этого UI пустой)."""
        survey = surveys.draft(title="Контракт parse-дат")
        import datetime

        for field in ("startDate", "endDate"):
            datetime.datetime.fromisoformat(survey[field].replace("Z", "+00:00"))


class TestErrorContract:
    @pytest.mark.xfail(reason="ДЕФЕКТ CONTRACT-2: у ошибок два формата — ProblemDetails от валидации "
                              "и произвольный {\"message\": ...} от контроллеров; тексты части "
                              "эндпоинтов англоязычные («Survey not found»), части — русские. "
                              "Единый контракт ошибок (Application/problem-details) не соблюдается",
                       strict=False)
    def test_errors_are_problem_details(self, surveys, admin_api):
        cases = [
            admin_api.post("/api/surveys/999999/publish"),
            admin_api.put("/api/questions/999999", json={"text": "x", "type": "Text",
                                                         "required": False, "options": None}),
            admin_api.post(f"/api/surveys/{surveys.draft(title='Ошибки')['id']}/matrix",
                           json={"evaluatorId": 0, "targetId": 0}),
        ]
        for response in cases:
            assert response.status_code == 400
            assert response.headers["content-type"].startswith("application/problem+json"), \
                f"{response.request.method} {response.url}: {message_text(response)}"
            body = response.json()
            assert {"type", "title", "status"} <= set(body), f"не ProblemDetails: {body}"

    def test_validation_errors_are_localized_and_keyed(self, admin_api):
        """Ошибка валидации — ProblemDetails с картой errors по именам полей."""
        response = admin_api.post("/api/surveys", json={**survey_payload(), "title": None})
        assert response.status_code == 400
        body = response.json()
        assert {"type", "title", "status", "errors"} <= set(body), f"не ProblemDetails: {body}"
        assert "Title" in body["errors"], f"ключ ошибки не имя поля: {body['errors']}"
        assert isinstance(body["errors"]["Title"], list) and body["errors"]["Title"]

    @pytest.mark.xfail(reason="ДЕФЕКТ CONTRACT-3: сообщения об ошибках частично на английском "
                              "(«Survey not found», «Question not found», «duplicate email»), "
                              "а интерфейс полностью русскоязычный", strict=False)
    def test_error_messages_are_in_russian(self, surveys, admin_api):
        responses = [
            admin_api.post("/api/surveys/999999/publish"),
            admin_api.put("/api/questions/999999", json={"text": "x", "type": "Text",
                                                         "required": False, "options": None}),
            admin_api.get("/api/surveys/999999"),
        ]
        for response in responses:
            text = message_text(response)
            assert not re.search(r"\b(not found|Survey|Question)\b", text), text


class TestOpenApiCompleteness:
    @pytest.mark.xfail(reason="ДЕФЕКТ CONTRACT-4: в swagger/v1/swagger.json ни один ответ не описан "
                              "схемой (все «200: {}» без content) — сгенерировать клиент или "
                              "проверять ответы по контракту из спецификации невозможно",
                       strict=False)
    def test_every_operation_documents_a_response_schema(self, swagger):
        missing = []
        for path, operations in swagger["paths"].items():
            for method, operation in operations.items():
                for code, response in (operation.get("responses") or {}).items():
                    if not code.startswith("2") or code == "204":
                        continue
                    if not (response.get("content") or {}).get("application/json", {}).get("schema"):
                        missing.append(f"{method.upper()} {path} -> {code}")
        assert not missing, f"{len(missing)} ответов без схемы: {missing[:5]}"

    @pytest.mark.xfail(reason="ДЕФЕКТ CONTRACT-6: в спецификации описан только успешный ответ «200», "
                              "ни один 4xx/401 не задокументирован — клиент не знает, какие коды "
                              "возвращает сервис и что с ними делать", strict=False)
    def test_every_operation_has_an_error_response(self, swagger):
        """Хотя бы один 4xx описан у каждого метода — иначе клиент не знает кодов."""
        for path, operations in swagger["paths"].items():
            for method, operation in operations.items():
                codes = set((operation.get("responses") or {}))
                assert any(code.startswith("4") for code in codes), f"{method} {path}: {codes}"

    @pytest.mark.xfail(reason="ДЕФЕКТ CONTRACT-5: спецификация объявляет required-поля "
                              "(title/startDate/endDate/authorId), но в CreateSurveyDto required "
                              "не проставлен — swagger разрешает пустой запрос, API его отклоняет",
                       strict=False)
    def test_request_schemas_declare_required_fields(self, swagger):
        for name in ("CreateSurveyDto", "CreateQuestionDto", "CreateEmployeeDto"):
            schema = swagger["components"]["schemas"][name]
            assert schema.get("required"), f"{name} без required-полей"

    def test_unknown_fields_are_ignored_not_rejected(self, admin_api):
        """ASP.NET не читает additionalProperties:false из схемы: лишние поля молча отбрасываются.
        Фиксируем фактическое поведение — генераторы клиентов на его основе будут ошибочны."""
        response = admin_api.post("/api/surveys", json={**survey_payload(
            title=f"Лишние поля {unique_suffix()}"), "totallyUnknown": 1})
        assert response.status_code == 201
        assert "totallyUnknown" not in response.json()
        admin_api.delete(f"/api/surveys/{response.json()['id']}")

    def test_nullable_in_spec_matches_runtime(self, swagger, admin_api):
        """description nullable:true — значит null допустим и приходит обратно как null."""
        schema = swagger["components"]["schemas"]["CreateSurveyDto"]
        assert schema["properties"]["description"]["nullable"] is True
        response = admin_api.post("/api/surveys", json={**survey_payload(
            title=f"Описание null {unique_suffix()}"), "description": None})
        assert response.status_code == 201
        assert response.json()["description"] is None
        admin_api.delete(f"/api/surveys/{response.json()['id']}")


class TestVersioningAndHeaders:
    def test_json_content_type_on_success(self, admin_api):
        for path in ("/api/surveys", "/api/employees", "/api/SurveyTemplates"):
            response = admin_api.get(path)
            assert response.status_code == 200
            assert response.headers["content-type"].startswith("application/json")

    def test_openapi_is_served_at_documented_path(self, swagger):
        assert swagger["openapi"].startswith("3.")
        assert swagger["info"]["title"], "в спецификации нет имени сервиса"

    def test_swagger_is_publicly_readable(self, api_base_url):
        """Фиксируем факт: swagger.json доступен без токена. В dev это удобно,
        для контура за периметром — решение безопасности, которое надо подтвердить."""
        response = ApiClient(api_base_url).get("/swagger/v1/swagger.json")
        assert response.status_code == 200
        assert "paths" in response.json()

    def test_base_url_from_env_is_used(self):
        assert API_BASE_URL.startswith("http"), "адрес бэкенда должен браться из окружения"
        assert ADMIN_EMAIL, "без учётки администратора прогон невозможен"
