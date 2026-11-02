"""API-тесты разграничения доступа (RBAC).

В системе три «роли»: JWT-претенки Role (SurveyAuthor/Respondent/Administrator/
SystemAdministrator) и флаг IsAdmin. Проверяем, что реально разрешено обычному
респонденту и что админ-панель действительно закрыта.
"""
from __future__ import annotations

import pytest

from helpers import (
    ADMINISTRATOR_EMAIL,
    RESPONDENT_EMAIL,
    SEED_EMPLOYEES,
    ApiClient,
    choice_question_payload,
    survey_payload,
    unique_suffix,
)

pytestmark = [pytest.mark.api, pytest.mark.rbac, pytest.mark.regression]

PETROV = SEED_EMPLOYEES["petrov"]["id"]
IVANOV = SEED_EMPLOYEES["ivanov"]["id"]


@pytest.fixture(scope="session")
def respondent_only_api(api_base_url: str, respondent_token: str):
    """Клиент пользователя без единой административной роли (Петров, Respondent)."""
    client = ApiClient(api_base_url, token=respondent_token)
    yield client
    client.close()


class TestAdminPanelGuard:
    @pytest.mark.smoke
    def test_system_administrators_can_use_admin_panel(self, admin_api):
        assert admin_api.get("/admin-panel/employees").status_code == 200

    @pytest.mark.parametrize("method,path", [
        ("GET", "/admin-panel/employees"),
        ("POST", "/admin-panel/employees/create"),
        ("PATCH", "/admin-panel/employees/update/1"),
        ("DELETE", "/admin-panel/employees/delete/1"),
    ])
    def test_respondent_is_forbidden_from_admin_panel(self, respondent_only_api, method, path):
        assert getattr(respondent_only_api, method.lower())(path).status_code == 403

    def test_plain_administrator_is_forbidden_from_admin_panel(self, login, api_base_url):
        """ДЕФЕКТ RBAC-1: у пользователя с ролью «Administrator» (admin@directum360.ru)
        в JWT IsAdmin=true, поэтому UI открывает ему админ-панель, а API требует
        SystemAdministrator и отвечает 403 — экран работает вхолостую."""
        client = ApiClient(api_base_url, token=login(ADMINISTRATOR_EMAIL))
        try:
            assert client.get("/admin-panel/employees").status_code == 403
        finally:
            client.close()

    def test_admin_flag_in_jwt_matches_role_claim(self, login):
        """Источник RBAC-1: у «обычного» Administrator в JWT IsAdmin=true,
        но роли SystemAdministrator нет — UI пускает в админку, API отвечает 403."""
        import base64
        import json as jsonlib

        def payload_of(token: str) -> dict:
            segment = token.split(".")[1]
            segment += "=" * (-len(segment) % 4)
            return jsonlib.loads(base64.urlsafe_b64decode(segment))

        administrator_payload = payload_of(login(ADMINISTRATOR_EMAIL))
        assert administrator_payload["IsAdmin"] == "True"
        assert "SystemAdministrator" not in administrator_payload["role"]
        respondent_payload = payload_of(login(RESPONDENT_EMAIL))
        assert respondent_payload["IsAdmin"] == "False"
        assert respondent_payload["role"] == "Respondent"


class TestBusinessEndpointsHaveNoRoleChecks:
    """Все бизнес-контроллеры защищены только фактом входа — ролей не проверяют вовсе."""

    @pytest.mark.smoke
    def test_respondent_can_read_every_survey_of_company(self, respondent_only_api, surveys):
        survey = surveys.draft(title="Опрос для RBAC-проверки")
        listed = respondent_only_api.get("/api/surveys").json()
        assert survey["id"] in [s["id"] for s in listed]

    def test_respondent_can_delete_someone_elses_survey(self, respondent_only_api, surveys):
        """ДЕФЕКТ RBAC-2: респондент создаёт и удаляет опросы, к которым не имеет отношения."""
        survey = surveys.draft(title="Опрос для проверки RBAC-удаления")
        response = respondent_only_api.delete(f"/api/surveys/{survey['id']}")
        assert response.status_code == 204
        surveys.created_surveys.remove(survey["id"])

    @pytest.mark.xfail(reason="ДЕФЕКТ RBAC-2: создавать опросы должен только SurveyAuthor/Administrator "
                              "(403 для респондента)", strict=False)
    def test_respondent_should_not_create_surveys(self, respondent_only_api):
        response = respondent_only_api.post("/api/surveys", json=survey_payload(authorId=PETROV))
        assert response.status_code == 403

    def test_respondent_can_modify_someone_elses_survey(self, respondent_only_api, surveys):
        """ДЕФЕКТ RBAC-3: чужой черновик можно редактировать, публиковать и завершать."""
        survey = surveys.draft(title="Чужой черновик")
        start, end = survey["startDate"], survey["endDate"]
        assert respondent_only_api.put(f"/api/surveys/{survey['id']}", json={
            "title": "Переписано респондентом", "startDate": start, "endDate": end}).status_code == 200
        assert respondent_only_api.post(f"/api/surveys/{survey['id']}/publish").status_code == 200
        assert respondent_only_api.post(f"/api/surveys/{survey['id']}/complete").status_code == 200

    @pytest.mark.xfail(reason="ДЕФЕКТ RBAC-3: изменение чужого опроса должно быть запрещено (403)",
                       strict=False)
    def test_respondent_should_not_publish_foreign_survey(self, respondent_only_api, surveys):
        survey = surveys.draft(title="Чужой черновик 2")
        assert respondent_only_api.post(f"/api/surveys/{survey['id']}/publish").status_code == 403

    def test_respondent_can_read_results_of_any_survey(self, respondent_only_api, surveys,
                                                       respondent_api):
        """ДЕФЕКТ RBAC-4: персональные ответы 360-оценки читаются любым вошедшим сотрудником."""
        setup = surveys.ready_survey()
        # оценщик в ready_survey — Петров, respondent_only_api — его клиент
        respondent_only_api.post(f"/api/public/{setup.token}/answers",
                                json={"answers": setup.answers()})
        response = respondent_only_api.get(f"/api/surveys/{setup.survey_id}/Results")
        assert response.status_code == 200
        assert response.json()["results"], "результаты должны быть, иначе проверка бессмысленна"


    @pytest.mark.xfail(reason="ДЕФЕКТ RBAC-4: результаты должны быть доступны только автору опроса "
                            "и администраторам", strict=False)
    def test_results_should_be_restricted_to_author(self, respondent_only_api, surveys, admin_api):
        setup = surveys.ready_survey()
        respondent_only_api.post(f"/api/public/{setup.token}/answers",
                                json={"answers": setup.answers()})
        assert respondent_only_api.get(
            f"/api/surveys/{setup.survey_id}/Results").status_code == 403

    def test_respondent_can_write_templates_and_matrix(self, respondent_only_api, surveys):
        """ДЕФЕКТ RBAC-5: справочники (шаблоны) и матрица доступны на запись всем."""
        survey = surveys.draft(title="Опрос под матрицу")
        assert respondent_only_api.post(
            f"/api/questions/surveys/{survey['id']}",
            json=choice_question_payload()).status_code == 200
        assert respondent_only_api.post(
            f"/api/surveys/{survey['id']}/matrix",
            json={"evaluatorId": PETROV, "targetId": IVANOV}).status_code == 200
        assert respondent_only_api.post(
            "/api/questions/templates",
            json={"name": "Шаблон от респондента", "text": "Т", "type": "Text",
                  "options": None}).status_code == 200

    def test_respondent_can_create_employees(self, respondent_only_api, admin_api):
        """ДЕФЕКТ RBAC-6: респондент добавляет сотрудников в справочник через /api/employees,
        в том числе с ролью SystemAdministrator (удаление — администратором, у респондента
        на админ-панель нет прав: 403)."""
        email = f"rbac-created.{unique_suffix()}@example.com"
        response = respondent_only_api.post("/api/employees", json={
            "fullName": "Создан респондентом", "email": email,
            "roles": ["SystemAdministrator"]})
        assert response.status_code == 201
        created_id = response.json()["id"]
        assert admin_api.delete(f"/admin-panel/employees/delete/{created_id}").status_code == 204

    @pytest.mark.xfail(reason="ДЕФЕКТ RBAC-6: самовыдача роли SystemAdministrator через API недопустима",
                       strict=False)
    def test_respondent_should_not_assign_administrator_role(self, respondent_only_api, admin_api):
        response = respondent_only_api.post("/api/employees", json={
            "fullName": "Самоназначенец", "email": f"rbac-selfadmin.{unique_suffix()}@example.com",
            "roles": ["SystemAdministrator"]})
        if response.status_code == 201:
            admin_api.delete(f"/admin-panel/employees/delete/{response.json()['id']}")
        assert response.status_code == 403


class TestUserScopeEndpoints:
    @pytest.mark.smoke
    def test_user_surveys_are_scoped_to_current_user(self, respondent_api, surveys, admin_api):
        """Личный кабинет показывает только назначения текущего пользователя."""
        setup = surveys.ready_survey(evaluator_ids=(PETROV,), target_id=IVANOV)
        other = surveys.ready_survey(evaluator_ids=(SEED_EMPLOYEES["ivanova"]["id"],))
        listed = respondent_api.get("/api/user/surveys").json()
        tokens = {item["token"] for item in listed}
        assert setup.token in tokens
        assert other.token not in tokens

    def test_user_surveys_require_authentication(self, api):
        assert api.get("/api/user/surveys").status_code == 401

    def test_user_surveys_expose_only_active_surveys(self, surveys, respondent_api):
        draft = surveys.draft(title="Черновик без публикаци")
        item = surveys.add_matrix_item(draft["id"], PETROV, IVANOV)
        listed = respondent_api.get("/api/user/surveys").json()
        assert item["token"] not in {entry["token"] for entry in listed}
