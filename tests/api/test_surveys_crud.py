"""API-тесты CRUD опросов: создание, валидация, чтение, фильтры, редактирование, удаление."""
from __future__ import annotations

import pytest

from helpers import (
    SEED_EMPLOYEES,
    STATUS_DRAFT,
    draft_window,
    iso_utc,
    message_text,
    now_utc,
    survey_payload,
    unique_suffix,
    validation_errors,
)

pytestmark = [pytest.mark.api, pytest.mark.surveys, pytest.mark.regression]


class TestCreateSurvey:
    @pytest.mark.smoke
    def test_created_survey_is_draft(self, surveys):
        survey = surveys.draft(title="Опрос 360 для отдела разработки")
        assert survey["status"] == STATUS_DRAFT
        assert survey["title"] == "Опрос 360 для отдела разработки"
        assert survey["authorId"] == SEED_EMPLOYEES["sysadmin"]["id"]
        assert survey["authorName"] == SEED_EMPLOYEES["sysadmin"]["fullName"]

    def test_created_at_location_header(self, admin_api, surveys):
        payload = survey_payload()
        response = admin_api.post("/api/surveys", json=payload)
        assert response.status_code == 201
        surveys.created_surveys.append(response.json()["id"])
        assert response.headers["Location"].lower().endswith(f"/api/surveys/{response.json()['id']}".lower())

    def test_dates_are_saved_exactly(self, surveys):
        start, end = draft_window()
        survey = surveys.draft(startDate=start, endDate=end)
        fetched = surveys.client.get(f"/api/surveys/{survey['id']}").json()
        assert fetched["startDate"].startswith(start[:16])
        assert fetched["endDate"].startswith(end[:16])

    @pytest.mark.parametrize("field", ["title", "startDate", "endDate", "authorId"])
    def test_required_fields_are_validated(self, admin_api, field):
        payload = survey_payload()
        payload.pop(field)
        response = admin_api.post("/api/surveys", json=payload)
        assert response.status_code == 400
        errors = validation_errors(response)
        assert errors, f"для {field} не вернулись детали ошибок: {response.text}"
        assert any(key.lower() == field.lower() for key in errors), f"ошибка не про {field}: {errors}"

    def test_end_date_before_start_date_is_rejected(self, admin_api):
        start, _ = draft_window()
        payload = survey_payload(startDate=start, endDate=iso_utc(now_utc()))
        response = admin_api.post("/api/surveys", json=payload)
        assert response.status_code == 400
        assert "EndDate" in validation_errors(response)

    def test_equal_dates_are_rejected(self, admin_api):
        start, _ = draft_window()
        response = admin_api.post("/api/surveys", json=survey_payload(startDate=start, endDate=start))
        assert response.status_code == 400

    @pytest.mark.parametrize("author_id", [0, -1])
    def test_non_positive_author_id_is_rejected(self, admin_api, author_id):
        response = admin_api.post("/api/surveys", json=survey_payload(authorId=author_id))
        assert response.status_code == 400
        assert "AuthorId" in validation_errors(response)

    def test_unknown_author_id_is_rejected_by_database(self, admin_api):
        """ДЕФЕКТ SURV-1: несуществующий authorId отсекается только FK-констрейнтом —
        клиент получает 409 с сырой ошибкой EF/SQLite вместо 400 с внятным текстом."""
        payload = survey_payload(authorId=999_999)
        response = admin_api.post("/api/surveys", json=payload)
        assert response.status_code == 409
        assert "inner exception" in message_text(response).lower()

    @pytest.mark.xfail(reason="ДЕФЕКТ SURV-1: проверка AuthorId должна быть на уровне валидации DTO",
                       strict=False)
    def test_unknown_author_id_should_be_validation_error(self, admin_api):
        response = admin_api.post("/api/surveys", json=survey_payload(authorId=999_999))
        assert response.status_code == 400
        assert "AuthorId" in validation_errors(response)

    def test_title_longer_than_ui_limit_is_rejected(self, admin_api):
        """ДЕФЕКТ SURV-2: форма даёт ввести 250 символов (maxLength=250), API принимает только 200."""
        response = admin_api.post("/api/surveys", json=survey_payload(title="Т" * 201))
        assert response.status_code == 400
        assert "Title" in validation_errors(response)

    def test_duplicate_titles_are_allowed(self, surveys):
        title = f"Дубликат {unique_suffix()}"
        first = surveys.draft(title=title)
        second = surveys.draft(title=title)
        assert first["id"] != second["id"]


class TestGetSurvey:
    @pytest.mark.smoke
    def test_get_by_id(self, surveys):
        survey = surveys.draft()
        response = surveys.client.get(f"/api/surveys/{survey['id']}")
        assert response.status_code == 200
        assert response.json()["id"] == survey["id"]

    @pytest.mark.parametrize("survey_id", [0, 999_999])
    def test_unknown_id_returns_404(self, admin_api, survey_id):
        assert admin_api.get(f"/api/surveys/{survey_id}").status_code == 404

    def test_list_contains_created_survey(self, surveys):
        survey = surveys.draft()
        listed = surveys.client.get("/api/surveys").json()
        found = [s for s in listed if s["id"] == survey["id"]]
        assert found and found[0]["title"] == survey["title"]


class TestListFilters:
    def test_filter_by_status_draft(self, surveys):
        survey = surveys.draft()
        listed = surveys.client.get("/api/surveys", params={"status": STATUS_DRAFT}).json()
        assert any(s["id"] == survey["id"] for s in listed)
        assert all(s["status"] == STATUS_DRAFT for s in listed)

    def test_filter_by_status_active_excludes_draft(self, surveys):
        survey = surveys.draft()
        listed = surveys.client.get("/api/surveys", params={"status": "Active"}).json()
        assert all(s["id"] != survey["id"] for s in listed)

    def test_search_by_title_substring(self, surveys):
        survey = surveys.draft(title=f"Уникальный поиск {unique_suffix()}")
        listed = surveys.client.get("/api/surveys", params={"search": "Уникальный поиск"}).json()
        assert survey["id"] in [s["id"] for s in listed]

    def test_search_is_case_insensitive(self, surveys):
        title = f"РЕГИСТР {unique_suffix()}"
        survey = surveys.draft(title=title)
        listed = surveys.client.get("/api/surveys", params={"search": title.lower()}).json()
        assert survey["id"] in [s["id"] for s in listed]

    def test_unknown_status_is_ignored(self, surveys):
        """Неизвестный статус молча возвращает всё вместо 400 — контракт надо зафиксировать."""
        survey = surveys.draft()
        listed = surveys.client.get("/api/surveys", params={"status": "NotAStatus"}).json()
        assert survey["id"] in [s["id"] for s in listed]

    def test_search_without_matches_returns_empty_list(self, admin_api):
        listed = admin_api.get("/api/surveys", params={"search": f"нет-такого-{unique_suffix()}"}).json()
        assert listed == []


class TestUpdateSurvey:
    @pytest.mark.smoke
    def test_update_draft_fields(self, surveys):
        survey = surveys.draft()
        start, end = draft_window()
        payload = {"title": "Новое название", "description": "Новое описание",
                   "startDate": start, "endDate": end}
        response = surveys.client.put(f"/api/surveys/{survey['id']}", json=payload)
        assert response.status_code == 200
        assert response.json()["title"] == "Новое название"
        updated = surveys.client.get(f"/api/surveys/{survey['id']}").json()
        assert updated["description"] == "Новое описание"

    def test_update_keeps_status_draft(self, surveys):
        survey = surveys.draft()
        start, end = draft_window()
        surveys.client.put(f"/api/surveys/{survey['id']}",
                           json={"title": "x", "startDate": start, "endDate": end})
        assert surveys.client.get(f"/api/surveys/{survey['id']}").json()["status"] == STATUS_DRAFT

    def test_partial_update_wipes_title_and_dates(self, surveys):
        """ДЕФЕКТ SURV-8: PUT не валидируется и не поддерживает частичное обновление —
        тело без дат затирает название в пустую и сбрасывает окно опроса на 0001-01-01,
        после чего опрос самовольно становится «Активен»."""
        survey = surveys.draft(title="Важный опрос")
        response = surveys.client.put(f"/api/surveys/{survey['id']}", json={"title": ""})
        assert response.status_code == 200, "ожидали частичный PUT — см. xfail-тест ниже"
        updated = surveys.client.get(f"/api/surveys/{survey['id']}").json()
        assert updated["title"] == ""
        assert updated["startDate"].startswith("0001-01-01")
        assert updated["endDate"].startswith("0001-01-01")

    @pytest.mark.xfail(reason="ДЕФЕКТ SURV-8: на UpdateSurveyDto нет валидатора "
                              "(CreateSurveyDtoValidator привязан только к созданию)", strict=False)
    def test_update_with_empty_title_should_be_rejected(self, surveys):
        survey = surveys.draft()
        response = surveys.client.put(f"/api/surveys/{survey['id']}", json={"title": ""})
        assert response.status_code == 400

    @pytest.mark.xfail(reason="ДЕФЕКТ SURV-8: PUT принимает title длиннее лимита валидатора", strict=False)
    def test_update_with_too_long_title_should_be_rejected(self, surveys):
        survey = surveys.draft()
        start, end = draft_window()
        response = surveys.client.put(f"/api/surveys/{survey['id']}",
                                      json={"title": "Д" * 300, "startDate": start, "endDate": end})
        assert response.status_code == 400

    def test_update_with_reversed_dates_is_accepted(self, surveys):
        """ДЕФЕКТ SURV-9: на обновлении не работает правило «endDate > startDate»."""
        survey = surveys.draft()
        start, end = draft_window()
        response = surveys.client.put(f"/api/surveys/{survey['id']}",
                                      json={"title": "Опрос", "startDate": end, "endDate": start})
        assert response.status_code == 200
        updated = surveys.client.get(f"/api/surveys/{survey['id']}").json()
        assert updated["endDate"] <= updated["startDate"]

    def test_update_unknown_survey_returns_404(self, admin_api):
        start, end = draft_window()
        response = admin_api.put("/api/surveys/999999",
                                 json={"title": "x", "startDate": start, "endDate": end})
        assert response.status_code == 404
        assert "not found" in message_text(response).lower()


class TestDeleteSurvey:
    @pytest.mark.smoke
    def test_delete_removes_survey(self, surveys, admin_api):
        survey = surveys.draft()
        survey_id = survey["id"]
        assert admin_api.delete(f"/api/surveys/{survey_id}").status_code == 204
        assert admin_api.get(f"/api/surveys/{survey_id}").status_code == 404
        surveys.created_surveys.remove(survey_id)

    def test_delete_survey_with_answers_is_impossible(self, surveys, admin_api, respondent_api):
        """ДЕФЕКТ SURV-10: опрос, по есть ответы, не удаляется — FK Answer→Question
        (Restrict) приводит к 409 с сырым текстом ошибки EF Core. В UI кнопка «Удалить»
        при этом есть и обещает «действие нельзя отменить»."""
        setup = surveys.ready_survey()
        respondent_api.post(f"/api/public/{setup.token}/answers", json={"answers": setup.answers()})
        response = admin_api.delete(f"/api/surveys/{setup.survey_id}")
        assert response.status_code == 409
        assert "inner exception" in message_text(response).lower()
        assert admin_api.get(f"/api/surveys/{setup.survey_id}").status_code == 200
        surveys.created_surveys.remove(setup.survey_id)

    @pytest.mark.xfail(reason="ДЕФЕКТ SURV-10: удаление опроса должно либо каскадно сметать "
                              "ответы, либо отвечать 409 с человекочитаемым текстом", strict=False)
    def test_delete_survey_with_answers_should_have_readable_error(self, surveys, admin_api,
                                                                   respondent_api):
        setup = surveys.ready_survey()
        respondent_api.post(f"/api/public/{setup.token}/answers", json={"answers": setup.answers()})
        response = admin_api.delete(f"/api/surveys/{setup.survey_id}")
        assert response.status_code in (204, 409)
        if response.status_code == 409:
            assert "ответ" in message_text(response).lower()
        surveys.created_surveys.remove(setup.survey_id)

    def test_delete_unknown_survey_currently_returns_204(self, admin_api):
        """ДЕФЕКТ SURV-3: удаление несуществующего опроса даёт 204 вместо 404 —
        клиент не может отличить успешное удаление от опечатки в id."""
        assert admin_api.delete("/api/surveys/999999").status_code == 204

    @pytest.mark.xfail(reason="ДЕФЕКТ SURV-3: несуществующий опрос при удалении должен давать 404",
                       strict=False)
    def test_delete_unknown_survey_should_return_404(self, admin_api):
        assert admin_api.delete("/api/surveys/999999").status_code == 404

    def test_delete_cascades_questions_and_assignments(self, surveys, admin_api):
        setup = surveys.ready_survey()
        survey_id = setup.survey_id
        admin_api.delete(f"/api/surveys/{survey_id}")
        surveys.created_surveys.remove(survey_id)
        assert admin_api.get(f"/api/questions/surveys/{survey_id}").json() == []
        assert admin_api.get(f"/api/surveys/{survey_id}/matrix").json() == []
