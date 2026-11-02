"""Фикстуры автотестов: авторизация через Mailpit, фабрики опросов, автоочистка."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable, Iterator

import pytest
import requests

from helpers import (
    ADMIN_EMAIL,
    API_BASE_URL,
    MAILPIT_URL,
    RESPONDENT_EMAIL,
    SEED_EMPLOYEES,
    ApiClient,
    MailpitClient,
    choice_question_payload,
    message_text,
    now_utc,
    question_payload,
    survey_payload,
    unique_suffix,
)


def pytest_addoption(parser: pytest.Parser) -> None:
    parser.addoption("--api-base", default=API_BASE_URL, help="базовый URL backend API")
    parser.addoption("--mailpit-base", default=MAILPIT_URL, help="базовый URL Mailpit API")


@pytest.fixture(scope="session")
def api_base_url(request: pytest.FixtureRequest) -> str:
    return request.config.getoption("--api-base").rstrip("/")


@pytest.fixture(scope="session")
def mailpit_url(request: pytest.FixtureRequest) -> str:
    return request.config.getoption("--mailpit-base").rstrip("/")


@pytest.fixture(scope="session")
def mailpit(mailpit_url: str) -> MailpitClient:
    return MailpitClient(mailpit_url)


@pytest.fixture(scope="session")
def backend_available(api_base_url: str) -> None:
    """Понятная ошибка вместо десятка падений, если бэкенд не поднят."""
    try:
        requests.get(f"{api_base_url}/swagger/v1/swagger.json", timeout=5)
    except requests.RequestException as exc:
        pytest.exit(f"backend недоступен по адресу {api_base_url}: {exc}", returncode=3)

@pytest.fixture(scope="session")
def login_as(api_base_url: str, login: Callable[[str], str]) -> Callable[[str], ApiClient]:
    """Фабрика: login_as('petrov') → ApiClient, авторизованный как petrov.

    Нужна из-за фикса RESP-6 (commit 9be4017): ответы по персональной ссылке
    оценщика принимаются только от самого оценщика. admin_api для этих
    тестов больше не подходит.

    Переиспользует фикстуру `login` (JWT кэшируется на сессию по email),
    только оборачивает токен в ApiClient.
    """
    cache: dict[str, ApiClient] = {}

    def _factory(key: str) -> ApiClient:
        if key in cache:
            return cache[key]
        if key not in SEED_EMPLOYEES:
            raise KeyError(
                f"нет seed-сотрудника {key!r}; доступны: {sorted(SEED_EMPLOYEES)}"
            )
        email = SEED_EMPLOYEES[key]["email"]
        token = login(email)
        client = ApiClient(api_base_url, token=token)
        cache[key] = client
        return client

    return _factory


@pytest.fixture
def api(api_base_url: str, backend_available: None) -> ApiClient:
    """Анонимный клиент (без токена)."""
    client = ApiClient(api_base_url)
    yield client
    client.close()


@pytest.fixture(scope="session")
def login(api_base_url: str, backend_available: None, mailpit: MailpitClient) -> Callable[[str], str]:
    """Возвращает функцию login(email) -> JWT. Токены кэшируются на сессию."""
    cache: dict[str, str] = {}

    def _login(email: str) -> str:
        if email in cache:
            return cache[email]
        marker = now_utc()
        anonymous = ApiClient(api_base_url)
        try:
            send = anonymous.post("/api/auth/send-code", json={"email": email})
            assert send.status_code == 200, f"не запросили код для {email}: {send.text[:200]}"
            code = mailpit.wait_for_login_code(email, since=marker)
            verify = anonymous.post("/api/auth/verify", json={"email": email, "code": code})
            assert verify.status_code == 200, f"не прошёл verify для {email}: {verify.text[:200]}"
            token = verify.json()["token"]
            cache[email] = token
            return token
        finally:
            anonymous.close()

    return _login


@pytest.fixture(scope="session")
def admin_token(login: Callable[[str], str]) -> str:
    """Системный администратор: права автора опросов и админ-панели."""
    return login(ADMIN_EMAIL)


@pytest.fixture(scope="session")
def respondent_token(login: Callable[[str], str]) -> str:
    """Обычный респондент (Петров), без прав администратора."""
    return login(RESPONDENT_EMAIL)


@pytest.fixture(scope="session")
def admin_api(api_base_url: str, admin_token: str) -> ApiClient:
    client = ApiClient(api_base_url, token=admin_token)
    yield client
    client.close()


@pytest.fixture(scope="session")
def respondent_api(api_base_url: str, respondent_token: str) -> ApiClient:
    client = ApiClient(api_base_url, token=respondent_token)
    yield client
    client.close()


@dataclass
class SurveySetup:
    """Готовый к прохождению опрос: вопросы + матрица + токены доступа."""

    survey_id: int
    title: str
    questions: list[dict] = field(default_factory=list)
    assignments: list[dict] = field(default_factory=list)

    @property
    def choice_question(self) -> dict:
        return next(q for q in self.questions if q["type"] == "SingleChoice")

    @property
    def text_question(self) -> dict:
        return next(q for q in self.questions if q["type"] == "Text")

    def token_for(self, evaluator_id: int) -> str:
        return next(a["token"] for a in self.assignments if a["evaluatorId"] == evaluator_id)

    @property
    def token(self) -> str:
        return self.assignments[0]["token"]

    def answers(self, **overrides: Any) -> list[dict]:
        """Корректный набор ответов: выбор по обязательному вопросу + текст."""
        choice = self.choice_question
        text = self.text_question
        return [
            {"questionId": choice["id"], "selectedOption": overrides.get(
                "selectedOption", choice["options"][0])},
            {"questionId": text["id"], "textAnswer": overrides.get(
                "textAnswer", "Автоматический комментарий")},
        ]


class SurveyFactory:
    """Создаёт тестовые сущности и удаляет их после теста."""

    def __init__(self, client: ApiClient):
        self.client = client
        self.created_surveys: list[int] = []
        self.created_templates: list[int] = []
        self.created_question_templates: list[int] = []
        self.created_respondent_templates: list[int] = []
        self.created_employees: list[int] = []

    # --- опросы ---
    def draft(self, **overrides: Any) -> dict:
        """Черновик с будущей датой старта — гарантированно остаётся черновиком."""
        overrides.setdefault("title", f"Автотест {unique_suffix()}")
        response = self.client.post("/api/surveys", json=survey_payload(**overrides))
        assert response.status_code == 201, f"опрос не создан: {response.status_code} {response.text}"
        survey = response.json()
        self.created_surveys.append(survey["id"])
        return survey

    def add_question(self, survey_id: int, **overrides: Any) -> dict:
        payload: dict | None = overrides.pop("payload", None)
        payload = payload or question_payload(**overrides)
        response = self.client.post(f"/api/questions/surveys/{survey_id}", json=payload)
        assert response.status_code == 200, f"вопрос не добавлен: {response.status_code} {response.text}"
        return response.json()

    def questions(self, survey_id: int) -> list[dict]:
        """Актуальное состояние вопросов опроса (GET richer, чем ответ POST)."""
        response = self.client.get(f"/api/questions/surveys/{survey_id}")
        assert response.status_code == 200, f"список вопросов не получен: {response.text}"
        return response.json()

    def add_matrix_item(self, survey_id: int, evaluator_id: int, target_id: int) -> dict:
        response = self.client.post(
            f"/api/surveys/{survey_id}/matrix",
            json={"evaluatorId": evaluator_id, "targetId": target_id},
        )
        assert response.status_code == 200, f"строка матрицы не добавлена: {response.text}"
        return response.json()

    def publish(self, survey_id: int) -> dict:
        response = self.client.post(f"/api/surveys/{survey_id}/publish")
        assert response.status_code == 200, f"публикация не удалась: {response.status_code} {response.text}"
        return response.json()

    def complete(self, survey_id: int) -> dict:
        response = self.client.post(f"/api/surveys/{survey_id}/complete")
        assert response.status_code == 200, f"завершение не удалось: {response.status_code} {response.text}"
        return response.json()

    def ready_survey(
        self,
        evaluator_ids: tuple[int, ...] = (SEED_EMPLOYEES["petrov"]["id"],),
        target_id: int = SEED_EMPLOYEES["ivanov"]["id"],
        publish: bool = True,
        **survey_overrides: Any,
    ) -> SurveySetup:
        """Опрос «как в жизни»: обязательный вопрос с вариантами, текстовый, матрица, публикация."""
        survey = self.draft(**survey_overrides)
        survey_id = survey["id"]
        self.add_question(survey_id, **choice_question_payload(required=True, order=1))
        self.add_question(survey_id, text="Свободный комментарий", type="Text",
                          required=False, order=2)
        questions = self.questions(survey_id)
        assignments = [self.add_matrix_item(survey_id, evaluator_id, target_id)
                       for evaluator_id in evaluator_ids]
        if publish:
            survey = self.publish(survey_id)
        return SurveySetup(
            survey_id=survey_id,
            title=survey["title"],
            questions=questions,
            assignments=assignments,
        )

    # --- шаблоны ---
    def survey_template(self, **overrides: Any) -> dict:
        payload: dict[str, Any] = {
            "name": f"Автотест шаблон {unique_suffix()}",
            "description": "Шаблон для автотеста",
            "questions": [
                {"text": "Вопрос из шаблона", "type": "SingleChoice", "required": True,
                 "order": 1, "options": ["Да", "Нет"]},
            ],
        }
        payload.update(overrides)
        response = self.client.post("/api/SurveyTemplates", json=payload)
        assert response.status_code == 201, f"шаблон опроса не создан: {response.status_code} {response.text}"
        template = response.json()
        self.created_templates.append(template["id"])
        return template

    def question_template(self, **overrides: Any) -> dict:
        payload: dict[str, Any] = {
            "name": f"Автотест вопрос {unique_suffix()}",
            "text": "Текст вопроса из шаблона",
            "type": "Text",
            "options": None,
        }
        payload.update(overrides)
        response = self.client.post("/api/questions/templates", json=payload)
        assert response.status_code == 200, f"шаблон вопроса не создан: {response.status_code} {response.text}"
        template = response.json()
        self.created_question_templates.append(template["id"])
        return template

    def respondent_template(self, **overrides: Any) -> dict:
        payload: dict[str, Any] = {
            "name": f"Автотест респонденты {unique_suffix()}",
            "description": "Шаблон респондентов для автотеста",
            "items": [{"employeeId": SEED_EMPLOYEES["petrov"]["id"]},
                      {"employeeId": SEED_EMPLOYEES["ivanova"]["id"]}],
            "targetEmployeeIds": [SEED_EMPLOYEES["ivanov"]["id"]],
        }
        payload.update(overrides)
        response = self.client.post("/api/respondent-templates", json=payload)
        assert response.status_code == 200, f"шаблон респондентов не создан: {response.text}"
        template = response.json()
        self.created_respondent_templates.append(template["id"])
        return template

    def employee(self, **overrides: Any) -> dict:
        payload: dict[str, Any] = {
            "fullName": f"Сотрудник Автотест {unique_suffix()}",
            "email": f"autotest.{unique_suffix()}@example.com",
            "roles": ["Respondent"],
        }
        payload.update(overrides)
        response = self.client.post("/api/employees", json=payload)
        assert response.status_code == 201, f"сотрудник не создан: {response.status_code} {response.text}"
        employee = response.json()
        self.created_employees.append(employee["id"])
        return employee

    def cleanup(self) -> None:
        """Best-effort очистка. Опросы, по которым есть ответы, удалить нельзя (см. SURV-10),
        поэтому о неотмытых хвостах сообщаем в логе, а не молчим."""
        for survey_id in self.created_surveys:
            response = self.client.delete(f"/api/surveys/{survey_id}")
            if response.status_code not in (204, 404):
                print(f"[cleanup] опрос {survey_id} не удалён: "
                      f"{response.status_code} {message_text(response)[:120]}")
        for template_id in self.created_templates:
            self.client.delete(f"/api/SurveyTemplates/{template_id}")
        for template_id in self.created_question_templates:
            self.client.delete(f"/api/questions/templates/{template_id}")
        for template_id in self.created_respondent_templates:
            self.client.delete(f"/api/respondent-templates/{template_id}")
        for employee_id in self.created_employees:
            # У /api/employees нет DELETE — вычищаем через админ-панель.
            self.client.delete(f"/admin-panel/employees/delete/{employee_id}")


@pytest.fixture
def surveys(admin_api: ApiClient) -> SurveyFactory:
    factory = SurveyFactory(admin_api)
    yield factory
    factory.cleanup()


@pytest.fixture
def ready_survey(surveys: SurveyFactory) -> SurveySetup:
    """Опубликованный опрос с вопросами и одной строкой матрицы (Петров → Иванов)."""
    return surveys.ready_survey()
