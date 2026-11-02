"""API-тесты шаблонов опросов: CRUD, создание опроса из шаблона, сохранение опроса как шаблона."""
from __future__ import annotations

import pytest

from helpers import (
    SEED_EMPLOYEES,
    STATUS_DRAFT,
    message_text,
    survey_payload,
    unique_suffix,
)

pytestmark = [pytest.mark.api, pytest.mark.templates, pytest.mark.regression]


def list_templates(client) -> list[dict]:
    response = client.get("/api/SurveyTemplates")
    assert response.status_code == 200
    return response.json()


class TestSurveyTemplateCrud:
    @pytest.mark.smoke
    def test_seed_templates_are_available_with_questions(self, admin_api):
        templates = list_templates(admin_api)
        assert {t["id"] for t in templates} >= {1, 2}
        competencies = next(t for t in templates if t["id"] == 1)
        assert len(competencies["questions"]) == 8
        assert competencies["questions"][0]["options"] == [
            "Отлично", "Хорошо", "Удовлетворительно", "Требует развития"]

    def test_questions_are_sorted_by_order(self, admin_api):
        template = next(t for t in list_templates(admin_api) if t["id"] == 2)
        assert [q["order"] for q in template["questions"]] == list(range(1, 10))

    @pytest.mark.smoke
    def test_created_template_is_returned_with_questions(self, surveys):
        template = surveys.survey_template()
        assert template["questions"][0]["text"] == "Вопрос из шаблона"
        assert template["questions"][0]["options"] == ["Да", "Нет"]
        assert template["id"] in [t["id"] for t in list_templates(surveys.client)]

    def test_created_template_survives_reload(self, surveys):
        template = surveys.survey_template()
        fetched = surveys.client.get(f"/api/SurveyTemplates/{template['id']}")
        assert fetched.status_code == 200
        assert fetched.json()["name"] == template["name"]

    def test_update_replaces_question_set(self, surveys):
        template = surveys.survey_template()
        payload = {
            "name": "Обновлённый шаблон",
            "description": "новое описание",
            "questions": [
                {"text": "Новый 1", "type": "Text", "required": False, "order": 1, "options": None},
                {"text": "Новый 2", "type": "SingleChoice", "required": True, "order": 2,
                 "options": ["A", "B"]},
            ],
        }
        response = surveys.client.put(f"/api/SurveyTemplates/{template['id']}", json=payload)
        assert response.status_code == 200
        body = response.json()
        assert body["name"] == "Обновлённый шаблон"
        assert [q["text"] for q in body["questions"]] == ["Новый 1", "Новый 2"]
        assert body["questions"][1]["options"] == ["A", "B"]

    def test_update_can_empty_questions(self, surveys):
        """ДЕФЕКТ TPL-1: шаблон без вопросов проходит — опрос из него будет пустым."""
        template = surveys.survey_template()
        response = surveys.client.put(f"/api/SurveyTemplates/{template['id']}",
                                      json={"name": "Пустой", "description": None, "questions": []})
        assert response.status_code == 200
        assert response.json()["questions"] == []

    def test_update_unknown_template_returns_500(self, admin_api):
        """ДЕФЕКТ TPL-2: отсутствие шаблона — это 404, а не 500 (сервис бросает Exception)."""
        response = admin_api.put("/api/SurveyTemplates/999999",
                                 json={"name": "x", "description": None, "questions": []})
        assert response.status_code == 500
        assert "Template not found" in message_text(response)

    def test_create_unknown_template_id_returns_404(self, admin_api):
        assert admin_api.get("/api/SurveyTemplates/999999").status_code == 404

    def test_delete_removes_template(self, surveys):
        template = surveys.survey_template()
        assert surveys.client.delete(f"/api/SurveyTemplates/{template['id']}").status_code == 204
        assert template["id"] not in [t["id"] for t in list_templates(surveys.client)]
        surveys.created_templates.remove(template["id"])

    def test_delete_unknown_template_is_silent(self, admin_api):
        """ДЕФЕКТ TPL-3: удаление несуществующего шаблона отвечает 204 вместо 404."""
        assert admin_api.delete("/api/SurveyTemplates/999999").status_code == 204

    def test_template_without_name_is_created(self, admin_api, surveys):
        """ДЕФЕКТ TPL-4: на CreateSurveyTemplateDto нет валидатора — шаблон с пустым
        или отсутствующим названием создаётся и попадает в список."""
        for body in ({"name": "", "description": "d", "questions": []},
                     {"description": "d", "questions": []}):
            response = admin_api.post("/api/SurveyTemplates", json=body)
            assert response.status_code == 201, f"ожидали 400 с ошибкой валидации: {response.text}"
            surveys.created_templates.append(response.json()["id"])
            assert response.json()["name"] == ""

    def test_null_name_is_rejected_by_model_binding(self, admin_api):
        """null в обязательном string-поле отклоняется биндингом ASP.NET (400)."""
        response = admin_api.post("/api/SurveyTemplates",
                                  json={"name": None, "description": "d", "questions": []})
        assert response.status_code == 400


class TestCreateSurveyFromTemplate:
    @pytest.mark.smoke
    def test_questions_are_copied_from_template(self, surveys):
        template = surveys.survey_template()
        survey = surveys.draft(templateId=template["id"])
        questions = surveys.questions(survey["id"])
        assert len(questions) == 1
        assert questions[0]["text"] == "Вопрос из шаблона"
        assert questions[0]["options"] == ["Да", "Нет"]
        assert questions[0]["required"] is True
        assert survey["status"] == STATUS_DRAFT

    def test_copy_from_seed_template_keeps_order(self, surveys):
        survey = surveys.draft(templateId=1)
        questions = surveys.questions(survey["id"])
        assert len(questions) == 8
        assert [q["order"] for q in questions] == list(range(1, 9))

    def test_copied_questions_are_independent(self, surveys):
        """Копирование из шаблона изолировано: правки опроса не трогают сам шаблон."""
        template = surveys.survey_template()
        survey = surveys.draft(templateId=template["id"])
        question_id = surveys.questions(survey["id"])[0]["id"]
        surveys.client.delete(f"/api/questions/{question_id}")
        assert surveys.client.delete(f"/api/surveys/{survey['id']}").status_code == 204
        surveys.created_surveys.remove(survey["id"])
        reloaded = surveys.client.get(f"/api/SurveyTemplates/{template['id']}").json()
        assert len(reloaded["questions"]) == 1, "изменения в опросе задели сам шаблон"

    def test_unknown_template_id_leaves_orphan_draft(self, admin_api, surveys):
        """ДЕФЕКТ TPL-6: опрос успевает сохраниться, а применение несуществующего шаблона
        падает 500 — в БД остаётся «сирой» черновик, который никто не создавал осознанно."""
        title = f"Сирота {unique_suffix()}"
        response = admin_api.post("/api/surveys", json=survey_payload(title=title, templateId=999999))
        assert response.status_code == 500
        assert "Template not found" in message_text(response)

        survivors = [s for s in admin_api.get("/api/surveys", params={"search": title}).json()
                     if s["title"] == title]
        for orphan in survivors:
            surveys.created_surveys.append(orphan["id"])
        assert len(survivors) == 1, (
            f"ожидали один осевший черновик после 500, найдено {len(survivors)}")

    @pytest.mark.xfail(reason="ДЕФЕКТ TPL-6: некорректный templateId должен отклоняться валидацией (400) "
                              "до создания опроса — ни одной записи в БД", strict=False)
    def test_unknown_template_id_should_be_rejected_without_side_effects(self, admin_api):
        title = f"Не должен появиться {unique_suffix()}"
        response = admin_api.post("/api/surveys", json=survey_payload(title=title, templateId=999999))
        assert response.status_code == 400
        assert admin_api.get("/api/surveys", params={"search": title}).json() == []

    def test_template_id_zero_is_treated_as_real_template(self, admin_api, surveys):
        """ДЕФЕКТ TPL-6: templateId=0 воспринимается как выбранный шаблон и приводит
        к 500 вместо создания пустого черновика."""
        response = admin_api.post("/api/surveys", json=survey_payload(templateId=0))
        if response.status_code == 201:
            surveys.created_surveys.append(response.json()["id"])
        assert response.status_code == 500, "нулевой templateId должен игнорироваться"


class TestSaveSurveyAsTemplate:
    @pytest.mark.smoke
    def test_survey_questions_become_template(self, surveys):
        setup = surveys.ready_survey(publish=False)
        surveys.add_question(setup.survey_id, text="Ещё вопрос", type="Text", required=False, order=3)
        response = surveys.client.post(f"/api/surveys/{setup.survey_id}/save-as-template",
                                       json={"name": f"Снимок {unique_suffix()}",
                                             "description": "из автотеста"})
        assert response.status_code == 200
        template = response.json()
        surveys.created_templates.append(template["id"])
        assert [q["text"] for q in template["questions"]] == [
            setup.questions[0]["text"], setup.questions[1]["text"], "Ещё вопрос"]
        assert template["questions"][0]["options"] == ["Отлично", "Хорошо", "Плохо"]

    def test_order_is_renumbered_from_one(self, surveys):
        setup = surveys.ready_survey(publish=False)
        surveys.client.put(f"/api/questions/surveys/{setup.survey_id}/reorder",
                           json=[{"id": q["id"], "order": index * 10}
                                 for index, q in enumerate(reversed(setup.questions), start=1)])
        response = surveys.client.post(f"/api/surveys/{setup.survey_id}/save-as-template",
                                       json={"name": f"Порядок {unique_suffix()}"})
        assert response.status_code == 200
        surveys.created_templates.append(response.json()["id"])
        assert [q["order"] for q in response.json()["questions"]] == [1, 2]

    def test_survey_without_questions_cannot_be_saved(self, surveys):
        survey = surveys.draft()
        response = surveys.client.post(f"/api/surveys/{survey['id']}/save-as-template",
                                       json={"name": "Пустой"})
        assert response.status_code == 400
        assert "нет вопросов" in message_text(response)

    def test_unknown_survey_when_saving_as_template(self, admin_api):
        response = admin_api.post("/api/surveys/999999/save-as-template", json={"name": "x"})
        assert response.status_code == 400
        assert "Опрос не найден" in message_text(response)

    def test_empty_template_name_is_accepted(self, surveys):
        """ДЕФЕКТ TPL-7: имя шаблона не валидируется — в список попадает безымянный шаблон."""
        setup = surveys.ready_survey(publish=False)
        response = surveys.client.post(f"/api/surveys/{setup.survey_id}/save-as-template",
                                       json={"name": ""})
        assert response.status_code == 200
        surveys.created_templates.append(response.json()["id"])
        assert response.json()["name"] == ""

    def test_saving_active_survey_is_allowed(self, surveys):
        """Публикация не мешает сохранить состав опроса как шаблон — это ожидаемое поведение."""
        setup = surveys.ready_survey()
        response = surveys.client.post(f"/api/surveys/{setup.survey_id}/save-as-template",
                                       json={"name": f"Активный {unique_suffix()}"})
        assert response.status_code == 200
        surveys.created_templates.append(response.json()["id"])
