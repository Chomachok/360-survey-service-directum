"""API-тесты переводов состояний опроса: Черновик → Активен → Завершён."""
from __future__ import annotations

from datetime import timedelta

import pytest

from helpers import (
    SEED_EMPLOYEES,
    STATUS_ACTIVE,
    STATUS_COMPLETED,
    STATUS_DRAFT,
    draft_window,
    iso_utc,
    message_text,
    now_utc,
    survey_payload,
)

pytestmark = [pytest.mark.api, pytest.mark.surveys, pytest.mark.regression]

PETROV = SEED_EMPLOYEES["petrov"]["id"]
IVANOV = SEED_EMPLOYEES["ivanov"]["id"]
IVANOVA = SEED_EMPLOYEES["ivanova"]["id"]


def status_of(client, survey_id: int) -> str:
    return client.get(f"/api/surveys/{survey_id}").json()["status"]


class TestPublish:
    @pytest.mark.smoke
    def test_publish_moves_draft_to_active(self, surveys):
        survey = surveys.draft()
        response = surveys.publish(survey["id"])
        assert response["status"] == STATUS_ACTIVE
        assert status_of(surveys.client, survey["id"]) == STATUS_ACTIVE

    def test_publish_is_not_repeatable(self, surveys):
        survey = surveys.draft()
        surveys.publish(survey["id"])
        again = surveys.client.post(f"/api/surveys/{survey['id']}/publish")
        assert again.status_code == 400
        assert "Only drafts can be published" in message_text(again)

    def test_cannot_publish_completed_survey(self, surveys):
        survey = surveys.draft()
        surveys.publish(survey["id"])
        surveys.complete(survey["id"])
        response = surveys.client.post(f"/api/surveys/{survey['id']}/publish")
        assert response.status_code == 400
        assert status_of(surveys.client, survey["id"]) == STATUS_COMPLETED

    def test_publish_unknown_survey_returns_400_instead_of_404(self, admin_api):
        """ДЕФЕКТ SURV-4: контроллер перехватывает любое исключение в BadRequest."""
        response = admin_api.post("/api/surveys/999999/publish")
        assert response.status_code == 400
        assert "Survey not found" in message_text(response)

    @pytest.mark.xfail(reason="ДЕФЕКТ SURV-5: можно опубликовать опрос без вопросов и без матрицы — "
                              "респондент получает пустую форму", strict=False)
    def test_publish_requires_questions_and_participants(self, surveys):
        survey = surveys.draft()
        response = surveys.client.post(f"/api/surveys/{survey['id']}/publish")
        assert response.status_code == 400, "пустой опрос удалось опубликовать"

    def test_publish_sends_invite_email_to_evaluator(self, surveys, mailpit):
        setup = surveys.ready_survey()
        message = mailpit.wait_for_message_containing(
            SEED_EMPLOYEES["petrov"]["email"], setup.token, subject_contains="Приглашение на опрос")
        body = mailpit.body(message["ID"]).replace("&amp;", "&")
        assert setup.token in body
        assert "login?redirect" in body, f"в письме нет ссылки на вход с редиректом: {body[:300]}"
        assert setup.title in body or "опрос" in body.lower()


class TestComplete:
    @pytest.mark.smoke
    def test_active_survey_can_be_completed(self, surveys):
        survey = surveys.draft()
        surveys.publish(survey["id"])
        response = surveys.complete(survey["id"])
        assert response["status"] == STATUS_COMPLETED

    def test_draft_cannot_be_completed(self, surveys):
        survey = surveys.draft()
        response = surveys.client.post(f"/api/surveys/{survey['id']}/complete")
        assert response.status_code == 400
        assert "Only active surveys can be completed" in message_text(response)

    def test_complete_is_not_repeatable(self, surveys):
        survey = surveys.draft()
        surveys.publish(survey["id"])
        surveys.complete(survey["id"])
        again = surveys.client.post(f"/api/surveys/{survey['id']}/complete")
        assert again.status_code == 400

    def test_complete_unknown_survey_returns_400(self, admin_api):
        assert admin_api.post("/api/surveys/999999/complete").status_code == 400

    def test_full_lifecycle_draft_active_completed(self, surveys):
        """Главный путь: создание → вопросы/матрица → публикация → завершение."""
        survey = surveys.draft(title="360 оценка за квартал")
        survey_id = survey["id"]
        assert status_of(surveys.client, survey_id) == STATUS_DRAFT

        surveys.add_question(survey_id, text="Как вы оцениваете работу?", type="Text", required=True)
        surveys.add_matrix_item(survey_id, PETROV, IVANOV)
        surveys.publish(survey_id)
        assert status_of(surveys.client, survey_id) == STATUS_ACTIVE

        surveys.complete(survey_id)
        assert status_of(surveys.client, survey_id) == STATUS_COMPLETED
        assert surveys.client.get(f"/api/surveys/{survey_id}/results").status_code == 200


class TestEditingPermissionsByStatus:
    def test_draft_survey_is_editable(self, surveys):
        survey = surveys.draft()
        start, end = draft_window()
        response = surveys.client.put(f"/api/surveys/{survey['id']}",
                                      json={"title": "Отредактирован", "startDate": start, "endDate": end})
        assert response.status_code == 200

    def test_active_survey_is_not_editable(self, surveys):
        survey = surveys.draft()
        surveys.publish(survey["id"])
        start, end = draft_window()
        response = surveys.client.put(f"/api/surveys/{survey['id']}",
                                      json={"title": "Нельзя", "startDate": start, "endDate": end})
        assert response.status_code == 404, "редактирование активного опроса не заблокировано"
        assert "только для черновиков" in message_text(response)

    @pytest.mark.xfail(reason="ДЕФЕКТ SURV-6: попытка редактировать активный опрос отвечает 404 "
                              "«не найдено» вместо 409 — UI не отличает запрет от отсутствующего опроса",
                       strict=False)
    def test_editing_active_survey_should_return_conflict(self, surveys):
        survey = surveys.draft()
        surveys.publish(survey["id"])
        start, end = draft_window()
        response = surveys.client.put(f"/api/surveys/{survey['id']}",
                                      json={"title": "Нельзя", "startDate": start, "endDate": end})
        assert response.status_code == 409

    def test_completed_survey_is_not_editable(self, surveys):
        survey = surveys.draft()
        surveys.publish(survey["id"])
        surveys.complete(survey["id"])
        start, end = draft_window()
        response = surveys.client.put(f"/api/surveys/{survey['id']}",
                                      json={"title": "Нельзя", "startDate": start, "endDate": end})
        assert response.status_code == 404

    def test_questions_locked_after_publish(self, surveys):
        setup = surveys.ready_survey(publish=False)
        surveys.publish(setup.survey_id)
        response = surveys.client.put(f"/api/questions/{setup.questions[0]['id']}",
                                      json={"text": "Новый текст", "type": "Text", "required": False})
        assert response.status_code == 400
        assert "not in Draft" in message_text(response)

    def test_matrix_locked_after_publish(self, surveys):
        setup = surveys.ready_survey(publish=False)
        surveys.publish(setup.survey_id)
        response = surveys.client.post(f"/api/surveys/{setup.survey_id}/matrix",
                                       json={"evaluatorId": IVANOVA, "targetId": IVANOV})
        assert response.status_code == 400
        assert "Черновик" in message_text(response)


class TestStatusByDates:
    def test_expired_window_is_not_a_draft_anymore(self, surveys):
        """Опрос с уже истёкшим окном не остаётся черновиком после первого чтения."""
        expired = surveys.draft(
            startDate=iso_utc(now_utc() - timedelta(days=3)),
            endDate=iso_utc(now_utc() - timedelta(days=1)),
        )
        assert status_of(surveys.client, expired["id"]) in (STATUS_ACTIVE, STATUS_COMPLETED)

    def test_future_window_stays_draft(self, surveys):
        survey = surveys.draft()
        surveys.client.get("/api/surveys")
        assert status_of(surveys.client, survey["id"]) == STATUS_DRAFT

    def test_survey_started_today_is_activated_on_read(self, surveys):
        """РЕГРЕССИЯ SURV-7: дата старта «сегодня» (типичный выбор в форме) мгновенно
        активирует опрос, и добавить вопросы или матрицу уже нельзя."""
        response = surveys.client.post("/api/surveys", json=survey_payload(
            startDate=iso_utc(now_utc()),
            endDate=iso_utc(now_utc() + timedelta(days=5))))
        assert response.status_code == 201
        survey_id = response.json()["id"]
        surveys.created_surveys.append(survey_id)

        # Первая же операция чтения (открытие дашборда) меняет статус.
        surveys.client.get("/api/surveys")
        assert status_of(surveys.client, survey_id) == STATUS_ACTIVE

        add_matrix = surveys.client.post(f"/api/surveys/{survey_id}/matrix",
                                         json={"evaluatorId": PETROV, "targetId": IVANOV})
        assert add_matrix.status_code == 400, "матрицу можно менять у уже активного опроса"

    @pytest.mark.xfail(reason="ДЕФЕКТ QUEST-1: у AddQuestionToSurveyAsync нет проверки статуса — "
                              "вопросы можно добавлять в активный и даже завершённый опрос",
                       strict=False)
    def test_adding_question_to_active_survey_should_be_forbidden(self, surveys):
        setup = surveys.ready_survey()
        response = surveys.client.post(f"/api/questions/surveys/{setup.survey_id}",
                                       json={"text": "Вопрос после публикации", "type": "Text",
                                             "required": True, "order": 9})
        assert response.status_code == 400

    @pytest.mark.xfail(reason="ДЕФЕКТ SURV-7: опрос не должен самовольно становиться активным — "
                              "публикация единственный переводчик в Active", strict=False)
    def test_survey_started_today_should_stay_draft_until_publish(self, surveys):
        response = surveys.client.post("/api/surveys", json=survey_payload(
            startDate=iso_utc(now_utc()),
            endDate=iso_utc(now_utc() + timedelta(days=5))))
        survey_id = response.json()["id"]
        surveys.created_surveys.append(survey_id)
        surveys.client.get("/api/surveys")
        assert status_of(surveys.client, survey_id) == STATUS_DRAFT
