"""API-тесты матрицы опроса (назначения «кто кого оценивает» и токены доступа)."""
from __future__ import annotations

import re

import pytest

from helpers import SEED_EMPLOYEES, message_text

pytestmark = [pytest.mark.api, pytest.mark.matrix, pytest.mark.regression]

PETROV = SEED_EMPLOYEES["petrov"]["id"]
IVANOV = SEED_EMPLOYEES["ivanov"]["id"]
IVANOVA = SEED_EMPLOYEES["ivanova"]["id"]
ALEKSANDROVNA = SEED_EMPLOYEES["aleksandrovna"]["id"]


def list_matrix(client, survey_id: int) -> list[dict]:
    response = client.get(f"/api/surveys/{survey_id}/matrix")
    assert response.status_code == 200
    return response.json()


class TestAddMatrixItem:
    @pytest.mark.smoke
    def test_assignment_gets_unique_token(self, surveys):
        survey = surveys.draft()
        first = surveys.add_matrix_item(survey["id"], PETROV, IVANOV)
        second = surveys.add_matrix_item(survey["id"], IVANOVA, IVANOV)
        assert re.fullmatch(r"[0-9a-f-]{36}", first["token"])
        assert first["token"] != second["token"]
        assert first["completed"] is False

    def test_created_row_is_visible_in_matrix(self, surveys):
        survey = surveys.draft()
        created = surveys.add_matrix_item(survey["id"], PETROV, IVANOV)
        rows = list_matrix(surveys.client, survey["id"])
        assert [r["id"] for r in rows] == [created["id"]]
        assert rows[0]["evaluatorName"] == SEED_EMPLOYEES["petrov"]["fullName"]
        assert rows[0]["targetName"] == SEED_EMPLOYEES["ivanov"]["fullName"]

    def test_self_assessment_is_allowed(self, surveys):
        """Самооценка допустима в API (в отличие от применения шаблона респондентов)."""
        survey = surveys.draft()
        created = surveys.add_matrix_item(survey["id"], IVANOV, IVANOV)
        assert created["evaluatorId"] == created["targetId"] == IVANOV

    def test_unknown_evaluator_is_rejected(self, surveys):
        survey = surveys.draft()
        response = surveys.client.post(f"/api/surveys/{survey['id']}/matrix",
                                       json={"evaluatorId": 999_999, "targetId": IVANOV})
        assert response.status_code == 400
        assert "Оценивающий не найден" in message_text(response)

    def test_unknown_target_is_rejected(self, surveys):
        survey = surveys.draft()
        response = surveys.client.post(f"/api/surveys/{survey['id']}/matrix",
                                       json={"evaluatorId": PETROV, "targetId": 999_999})
        assert response.status_code == 400
        assert "Оцениваемый не найден" in message_text(response)

    def test_matrix_of_unknown_survey(self, surveys):
        response = surveys.client.post("/api/surveys/999999/matrix",
                                       json={"evaluatorId": PETROV, "targetId": IVANOV})
        assert response.status_code == 400
        assert "Опрос не найден" in message_text(response)

    def test_duplicate_pair_is_allowed(self, surveys):
        """ДЕФЕКТ MATRIX-1: одна пара «оценивающий→оцениваемый» может быть добавлена
        несколько раз — респондент получает дубли ссылок, а в результатах появляются
        одинаковые оценщики."""
        survey = surveys.draft()
        first = surveys.add_matrix_item(survey["id"], PETROV, IVANOV)
        second = surveys.add_matrix_item(survey["id"], PETROV, IVANOV)
        assert first["id"] != second["id"]
        rows = list_matrix(surveys.client, survey["id"])
        assert len(rows) == 2

    @pytest.mark.xfail(reason="ДЕФЕКТ MATRIX-1: нужна проверка уникальности пары "
                              "(SurveyId, EvaluatorId, TargetId)", strict=False)
    def test_duplicate_pair_should_be_rejected(self, surveys):
        survey = surveys.draft()
        surveys.add_matrix_item(survey["id"], PETROV, IVANOV)
        response = surveys.client.post(f"/api/surveys/{survey['id']}/matrix",
                                       json={"evaluatorId": PETROV, "targetId": IVANOV})
        assert response.status_code == 409

    def test_created_response_has_empty_names(self, surveys):
        """ДЕФЕКТ MATRIX-2: POST отвечает пустыми evaluatorName/targetName — UI не может
        показать строку без перезагрузки."""
        survey = surveys.draft()
        created = surveys.add_matrix_item(survey["id"], PETROV, IVANOV)
        assert created["evaluatorName"] == ""
        assert created["targetName"] == ""


class TestMatrixStatusRestrictions:
    def test_add_after_publish_is_forbidden(self, surveys):
        setup = surveys.ready_survey(publish=False)
        surveys.publish(setup.survey_id)
        response = surveys.client.post(f"/api/surveys/{setup.survey_id}/matrix",
                                       json={"evaluatorId": IVANOVA, "targetId": IVANOV})
        assert response.status_code == 400
        assert "Черновик" in message_text(response)

    def test_list_is_available_for_active_survey(self, surveys):
        setup = surveys.ready_survey()
        rows = list_matrix(surveys.client, setup.survey_id)
        assert len(rows) == 1
        assert rows[0]["token"] == setup.token


class TestDeleteMatrixItem:
    def test_delete_removes_row(self, surveys):
        survey = surveys.draft()
        created = surveys.add_matrix_item(survey["id"], PETROV, IVANOV)
        assert surveys.client.delete(f"/api/matrix/{created['id']}").status_code == 204
        assert list_matrix(surveys.client, survey["id"]) == []

    def test_delete_unknown_row(self, admin_api):
        response = admin_api.delete("/api/matrix/999999")
        assert response.status_code == 404
        assert "Assignment not found" in message_text(response)

    def test_delete_answered_row_is_forbidden(self, surveys, login_as):
        setup = surveys.ready_survey()
        login_as("petrov").post(f"/api/public/{setup.token}/answers",
                                json={"answers": setup.answers()})
        assignment_id = setup.assignments[0]["id"]
        response = surveys.client.delete(f"/api/matrix/{assignment_id}")
        assert response.status_code == 404
        assert "уже пройден опрос" in message_text(response)
        assert list_matrix(surveys.client, setup.survey_id), "назначение всё-таки удалилось"


    @pytest.mark.xfail(reason="ДЕФЕКТ MATRIX-4: …", strict=False)
    def test_delete_answered_row_should_return_conflict(self, surveys, login_as):
        setup = surveys.ready_survey()
        login_as("petrov").post(f"/api/public/{setup.token}/answers",
                                json={"answers": setup.answers()})
        response = surveys.client.delete(f"/api/matrix/{setup.assignments[0]['id']}")
        assert response.status_code == 409


class TestMatrixOnUnknownSurvey:
    def test_empty_list_instead_of_404(self, admin_api):
        """ДЕФЕКТ MATRIX-3: GET матрицы несуществующего опроса отвечает 200 и пустым списком."""
        rows = list_matrix(admin_api, 999_999)
        assert rows == []
