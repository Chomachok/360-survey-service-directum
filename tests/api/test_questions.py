"""API-тесты вопросов опроса и шаблонов вопросов."""
from __future__ import annotations

import pytest

from helpers import (
    SEED_EMPLOYEES,
    choice_question_payload,
    message_text,
    question_payload,
)

pytestmark = [pytest.mark.api, pytest.mark.questions, pytest.mark.regression]

PETROV = SEED_EMPLOYEES["petrov"]["id"]
IVANOV = SEED_EMPLOYEES["ivanov"]["id"]


def list_questions(client, survey_id: int) -> list[dict]:
    response = client.get(f"/api/questions/surveys/{survey_id}")
    assert response.status_code == 200
    return response.json()


def list_templates(client) -> list[dict]:
    response = client.get("/api/questions/templates")
    assert response.status_code == 200
    return response.json()


class TestCreateQuestion:
    @pytest.mark.smoke
    def test_text_question_appears_in_survey(self, surveys):
        survey = surveys.draft()
        created = surveys.add_question(survey["id"], text="Что получилось хорошо?", type="Text",
                                       required=True, order=1)
        stored = list_questions(surveys.client, survey["id"])
        assert [q["id"] for q in stored] == [created["id"]]
        assert stored[0]["text"] == "Что получилось хорошо?"
        assert stored[0]["required"] is True

    def test_single_choice_question_keeps_options(self, surveys):
        survey = surveys.draft()
        created = surveys.add_question(survey["id"], **choice_question_payload(
            text="Как оцениваете коммуникацию?", options=["Отлично", "Хорошо", "Плохо"]))
        stored = next(q for q in list_questions(surveys.client, survey["id"])
                      if q["id"] == created["id"])
        assert stored["type"] == "SingleChoice"
        assert stored["options"] == ["Отлично", "Хорошо", "Плохо"]

    def test_create_response_omits_options(self, surveys):
        """ДЕФЕКТ QUEST-2: POST /questions возвращает options=null, хотя варианты сохранены."""
        survey = surveys.draft()
        created = surveys.add_question(survey["id"], **choice_question_payload())
        assert created["options"] is None

    @pytest.mark.parametrize("order", [1, 2, 3])
    def test_questions_are_returned_sorted_by_order(self, surveys, order):
        survey = surveys.draft()
        for index in (3, 1, 2):
            surveys.add_question(survey["id"], text=f"Вопрос {index}", type="Text",
                                 required=False, order=index)
        stored = list_questions(surveys.client, survey["id"])
        assert [q["order"] for q in stored] == [1, 2, 3]

    def test_unknown_question_type_is_rejected(self, surveys):
        survey = surveys.draft()
        response = surveys.client.post(f"/api/questions/surveys/{survey['id']}",
                                       json={"text": "В", "type": "Rating", "required": True, "order": 1})
        assert response.status_code == 400

    def test_empty_text_is_accepted(self, surveys):
        """ДЕФЕКТ QUEST-3: для вопросов нет валидации — пустой текст сохраняется."""
        survey = surveys.draft()
        response = surveys.client.post(f"/api/questions/surveys/{survey['id']}",
                                       json=question_payload(text=""))
        assert response.status_code == 200
        assert response.json()["text"] == ""

    def test_single_choice_without_options_is_accepted(self, surveys):
        """ДЕФЕКТ QUEST-3: опрос с вопросом «выбор» без вариантов недоступен для прохождения в UI."""
        survey = surveys.draft()
        created = surveys.add_question(survey["id"], text="Выберите вариант", type="SingleChoice",
                                       required=True, order=1, options=[])
        stored = next(q for q in list_questions(surveys.client, survey["id"])
                      if q["id"] == created["id"])
        assert stored["options"] in ([], None)

    def test_add_question_to_unknown_survey_returns_500(self, surveys, admin_api):
        """ДЕФЕКТ QUEST-4: сервис бросает обычное Exception, middleware считает его как 500."""
        response = admin_api.post("/api/questions/surveys/999999", json=question_payload())
        assert response.status_code == 500
        assert "Survey not found" in message_text(response)

    @pytest.mark.xfail(reason="ДЕФЕКТ QUEST-4: несуществующий опрос должен давать 404, а не 500",
                       strict=False)
    def test_add_question_to_unknown_survey_should_be_404(self, admin_api):
        assert admin_api.post("/api/questions/surveys/999999", json=question_payload()).status_code == 404


class TestUpdateQuestion:
    def test_update_in_draft(self, surveys):
        survey = surveys.draft()
        question = surveys.add_question(survey["id"], **choice_question_payload(options=["А", "Б"]))
        response = surveys.client.put(f"/api/questions/{question['id']}", json={
            "text": "Обновлённый текст", "type": "SingleChoice", "required": False,
            "options": ["А", "Б", "В"]})
        assert response.status_code == 200
        stored = next(q for q in list_questions(surveys.client, survey["id"])
                      if q["id"] == question["id"])
        assert stored["text"] == "Обновлённый текст"
        assert stored["required"] is False
        assert stored["options"] == ["А", "Б", "В"]

    def test_update_can_change_type_and_drop_options(self, surveys):
        survey = surveys.draft()
        question = surveys.add_question(survey["id"], **choice_question_payload())
        surveys.client.put(f"/api/questions/{question['id']}",
                           json={"text": "Теперь текст", "type": "Text", "required": True, "options": []})
        stored = next(q for q in list_questions(surveys.client, survey["id"]) if q["id"] == question["id"])
        assert stored["type"] == "Text"
        assert stored["options"] is None

    def test_update_question_of_active_survey_is_forbidden(self, surveys):
        setup = surveys.ready_survey()
        response = surveys.client.put(f"/api/questions/{setup.questions[0]['id']}",
                                      json={"text": "Нельзя", "type": "Text", "required": True})
        assert response.status_code == 400
        assert "not in Draft" in message_text(response)

    def test_update_unknown_question(self, admin_api):
        response = admin_api.put("/api/questions/999999",
                                 json={"text": "x", "type": "Text", "required": False})
        assert response.status_code == 400
        assert "Question not found" in message_text(response)


class TestDeleteQuestion:
    def test_delete_removes_question(self, surveys):
        survey = surveys.draft()
        question = surveys.add_question(survey["id"], text="Удалить меня", type="Text")
        assert surveys.client.delete(f"/api/questions/{question['id']}").status_code == 204
        assert question["id"] not in [q["id"] for q in list_questions(surveys.client, survey["id"])]

    def test_delete_unknown_question_is_silent(self, admin_api):
        """ДЕФЕКТ QUEST-5: удаление несуществующего вопроса даёт 204 вместо 404."""
        assert admin_api.delete("/api/questions/999999").status_code == 204

    def test_delete_question_with_answers_is_conflict(self, surveys, admin_api):
        setup = surveys.ready_survey()
        admin_api.post(f"/api/public/{setup.token}/answers", json={"answers": setup.answers()})
        response = admin_api.delete(f"/api/questions/{setup.choice_question['id']}")
        assert response.status_code == 409, "вопрос с ответами нельзя удалить — FK должен сработать явно"


class TestReorderQuestions:
    def test_reorder_changes_list(self, surveys):
        survey = surveys.draft()
        first = surveys.add_question(survey["id"], text="Первый", type="Text", order=1)
        second = surveys.add_question(survey["id"], text="Второй", type="Text", order=2)
        response = surveys.client.put(f"/api/questions/surveys/{survey['id']}/reorder",
                                     json=[{"id": first["id"], "order": 2},
                                           {"id": second["id"], "order": 1}])
        assert response.status_code == 200
        assert [q["text"] for q in list_questions(surveys.client, survey["id"])] == ["Второй", "Первый"]

    def test_reorder_with_foreign_question_is_rejected(self, surveys):
        mine = surveys.draft()
        other = surveys.draft()
        foreign = surveys.add_question(other["id"], text="Чужой", type="Text", order=1)
        mine_question = surveys.add_question(mine["id"], text="Мой", type="Text", order=1)
        response = surveys.client.put(f"/api/questions/surveys/{mine['id']}/reorder",
                                     json=[{"id": mine_question["id"], "order": 1},
                                           {"id": foreign["id"], "order": 2}])
        assert response.status_code == 400
        assert "не принадлежит" in message_text(response)

    def test_reorder_survey_without_questions(self, surveys):
        survey = surveys.draft()
        response = surveys.client.put(f"/api/questions/surveys/{survey['id']}/reorder",
                                     json=[{"id": 1, "order": 1}])
        assert response.status_code == 400
        assert "не найдены" in message_text(response)

    def test_reorder_is_allowed_in_active_survey(self, surveys):
        """ДЕФЕКТ QUEST-6: порядок вопросов можно менять у опубликованного опроса."""
        setup = surveys.ready_survey()
        payload = [{"id": q["id"], "order": 10 - q["order"]} for q in setup.questions]
        response = surveys.client.put(f"/api/questions/surveys/{setup.survey_id}/reorder", json=payload)
        assert response.status_code == 200


class TestQuestionTemplates:
    @pytest.mark.smoke
    def test_seed_templates_are_available(self, admin_api):
        templates = admin_api.get("/api/questions/templates").json()
        assert len(templates) >= 2
        assert {"id", "name", "text", "type", "options"} <= set(templates[0])

    def test_created_template_is_listed(self, surveys):
        template = surveys.question_template(name="Шаблон: обратная связь",
                                            text="Что улучшить?", type="Text")
        listed = list_templates(surveys.client)
        assert template["id"] in [t["id"] for t in listed]

    def test_template_with_options_round_trip(self, surveys):
        template = surveys.question_template(name="Шаблон выбора", text="Оцените",
                                             type="SingleChoice", options=["Да", "Нет"])
        listed = next(t for t in list_templates(surveys.client) if t["id"] == template["id"])
        assert listed["type"] == "SingleChoice"

    @pytest.mark.xfail(reason="ДЕФЕКТ QUEST-7: QuestionsController.UpdateTemplate не содержит await — "
                              "в ответ сериализуется объект Task, а не DTO шаблона", strict=True)
    def test_update_template_returns_template_dto(self, surveys, admin_api):
        template = surveys.question_template(name="До", text="Текст до", type="Text")
        response = admin_api.put(f"/api/questions/templates/{template['id']}",
                                json={"name": "После", "text": "Текст после",
                                      "type": "SingleChoice", "options": ["А", "Б"]})
        assert response.status_code == 200
        body = response.json()
        assert body.get("name") == "После", f"вернулся мусор: {str(body)[:200]}"
        assert "status" not in body and "result" not in body

    def test_update_template_persists_changes(self, surveys, admin_api):
        template = surveys.question_template(name="До", text="Текст до", type="Text")
        admin_api.put(f"/api/questions/templates/{template['id']}",
                      json={"name": "После", "text": "Текст после", "type": "Text", "options": None})
        listed = next(t for t in list_templates(surveys.client) if t["id"] == template["id"])
        assert listed["name"] == "После"
        assert listed["text"] == "Текст после"

    def test_delete_template(self, surveys, admin_api):
        template = surveys.question_template()
        assert admin_api.delete(f"/api/questions/templates/{template['id']}").status_code == 204
        assert template["id"] not in [t["id"] for t in list_templates(surveys.client)]
        surveys.created_question_templates.remove(template["id"])

    def test_delete_unknown_template_is_silent(self, admin_api):
        assert admin_api.delete("/api/questions/templates/999999").status_code == 204

    def test_save_question_as_template(self, surveys):
        survey = surveys.draft()
        question = surveys.add_question(survey["id"], **choice_question_payload(
            text="Как вас поддерживают коллеги?", options=["Всегда", "Иногда", "Никогда"]))
        response = surveys.client.post(f"/api/questions/{question['id']}/save-as-template",
                                      json={"name": "Из опроса"})
        assert response.status_code == 200
        template = response.json()
        assert template["text"] == "Как вас поддерживают коллеги?"
        assert template["type"] == "SingleChoice"
        surveys.created_question_templates.append(template["id"])
        assert template["id"] in [t["id"] for t in list_templates(surveys.client)]

    def test_save_unknown_question_as_template(self, admin_api):
        response = admin_api.post("/api/questions/999999/save-as-template", json={"name": "x"})
        assert response.status_code == 400


