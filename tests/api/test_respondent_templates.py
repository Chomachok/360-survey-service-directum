"""API-тесты шаблонов респондентов: CRUD, применение к опросу, сохранение состава опроса как шаблона."""
from __future__ import annotations

import pytest

from helpers import SEED_EMPLOYEES, message_text

pytestmark = [pytest.mark.api, pytest.mark.templates, pytest.mark.regression]

PETROV = SEED_EMPLOYEES["petrov"]["id"]
IVANOV = SEED_EMPLOYEES["ivanov"]["id"]
IVANOVA = SEED_EMPLOYEES["ivanova"]["id"]
ALEKSANDROVNA = SEED_EMPLOYEES["aleksandrovna"]["id"]


def list_templates(client) -> list[dict]:
    response = client.get("/api/respondent-templates")
    assert response.status_code == 200
    return response.json()


def matrix_of(client, survey_id: int) -> list[dict]:
    return client.get(f"/api/surveys/{survey_id}/matrix").json()


class TestRespondentTemplateRead:
    @pytest.mark.smoke
    def test_seed_templates_are_listed(self, admin_api):
        templates = list_templates(admin_api)
        assert {"id", "name", "description", "items", "targets", "links"} <= set(templates[0])
        assert {t["name"] for t in templates} >= {"Классическая 360", "Только коллеги"}

    def test_seed_template_exposes_items_and_names(self, admin_api):
        template = admin_api.get("/api/respondent-templates/2").json()
        assert {i["employeeId"] for i in template["items"]} == {PETROV, IVANOVA, ALEKSANDROVNA}
        assert all(i["employeeName"] for i in template["items"]), "в items не подтянулись ФИО"

    def test_unknown_template_returns_404(self, admin_api):
        response = admin_api.get("/api/respondent-templates/999999")
        assert response.status_code == 404

    def test_negative_id_is_not_found(self, admin_api):
        assert admin_api.get("/api/respondent-templates/-1").status_code in (404, 400)


class TestRespondentTemplateCreate:
    @pytest.mark.smoke
    def test_created_template_keeps_items_and_targets(self, surveys):
        template = surveys.respondent_template()
        assert {i["employeeId"] for i in template["items"]} == {PETROV, IVANOVA}
        assert [t["employeeId"] for t in template["targets"]] == [IVANOV]
        assert template["links"] == []
        assert template["id"] in [t["id"] for t in list_templates(surveys.client)]

    def test_universal_template_has_no_targets(self, surveys):
        template = surveys.respondent_template(targetEmployeeIds=[])
        assert template["targets"] == []

    def test_description_is_optional(self, surveys):
        template = surveys.respondent_template(description=None)
        assert template["description"] is None

    @pytest.mark.parametrize("payload,expected_fragment", [
        ({"name": ""}, "Укажите название шаблона"),
        ({"name": "   "}, "Укажите название шаблона"),
        ({"items": []}, "хотя бы одного оценивающего"),
        ({"items": [{"employeeId": None}]}, "должен быть выбран сотрудник"),
        ({"items": [{"employeeId": 999999}]}, "не найден в системе"),
        ({"items": [{"employeeId": PETROV}, {"employeeId": PETROV}]}, "повторяющиеся оценивающие"),
        ({"targetEmployeeIds": [999999]}, "Оцениваемый сотрудник с id=999999 не найден"),
        ({"name": "Ш" * 256}, "255 символов"),
    ], ids=["empty-name", "blank-name", "no-items", "null-item", "unknown-item",
            "duplicate-items", "unknown-target", "long-name"])
    def test_invalid_payloads_are_rejected_with_text(self, surveys, admin_api, payload, expected_fragment):
        body = {"name": "Проверка", "items": [{"employeeId": PETROV}],
                "targetEmployeeIds": [IVANOV], **payload}
        response = admin_api.post("/api/respondent-templates", json=body)
        if response.status_code == 200:  # на случай регрессии в обратную сторону — чистим за собой
            surveys.created_respondent_templates.append(response.json()["id"])
        assert response.status_code == 400, f"{body} принят: {response.text}"
        assert expected_fragment in message_text(response)

    def test_duplicate_targets_are_deduplicated_silently(self, surveys, admin_api):
        """ДЕФЕКТ RT-4: ValidateTargetsAsync применяет Distinct() до проверки дублей,
        поэтому ветка «в списке оцениваемых есть дубликаты» недостижима."""
        response = admin_api.post("/api/respondent-templates", json={
            "name": "Дубли целей", "items": [{"employeeId": PETROV}],
            "targetEmployeeIds": [IVANOV, IVANOV]})
        assert response.status_code == 200
        surveys.created_respondent_templates.append(response.json()["id"])
        assert [t["employeeId"] for t in response.json()["targets"]] == [IVANOV]

    @pytest.mark.xfail(reason="ДЕФЕКТ RT-4: дубликаты оцениваемых должны отклоняться 400, "
                              "а не молча схлопываться через Distinct()", strict=False)
    def test_duplicate_targets_should_be_rejected(self, admin_api, surveys):
        response = admin_api.post("/api/respondent-templates", json={
            "name": "Дубли целей", "items": [{"employeeId": PETROV}],
            "targetEmployeeIds": [IVANOV, IVANOV]})
        if response.status_code == 200:
            surveys.created_respondent_templates.append(response.json()["id"])
        assert response.status_code == 400

    def test_self_assessment_cannot_be_created_via_api(self, admin_api, surveys):
        """ДЕФЕКТ RT-1: DTO пункта шаблона не содержит Role, а валидация запрещает
        employeeId=null — создать «самооценку» (как в seed-шаблоне «Классическая 360») нельзя."""
        response = admin_api.post("/api/respondent-templates", json={
            "name": "Самооценка + коллеги",
            "items": [{"employeeId": None}, {"employeeId": PETROV}],
            "targetEmployeeIds": [IVANOV],
        })
        assert response.status_code == 400
        assert "должен быть выбран сотрудник" in message_text(response)

    def test_template_with_explicit_links(self, surveys):
        template = surveys.respondent_template(
            items=[{"employeeId": PETROV}, {"employeeId": IVANOVA}],
            targetEmployeeIds=[IVANOV, ALEKSANDROVNA],
            links=[{"evaluatorEmployeeId": PETROV, "targetEmployeeId": IVANOV}])
        assert [(l["evaluatorEmployeeId"], l["targetEmployeeId"]) for l in template["links"]] == [
            (PETROV, IVANOV)]


class TestRespondentTemplateUpdate:
    def test_update_replaces_whole_composition(self, surveys):
        template = surveys.respondent_template()
        response = surveys.client.put(f"/api/respondent-templates/{template['id']}", json={
            "name": "Обновлённый состав",
            "description": "новое",
            "items": [{"employeeId": ALEKSANDROVNA}],
            "targetEmployeeIds": [IVANOVA],
        })
        assert response.status_code == 200
        body = response.json()
        assert body["name"] == "Обновлённый состав"
        assert [i["employeeId"] for i in body["items"]] == [ALEKSANDROVNA]
        assert [t["employeeId"] for t in body["targets"]] == [IVANOVA]

    def test_update_can_make_template_universal(self, surveys):
        template = surveys.respondent_template()
        response = surveys.client.put(f"/api/respondent-templates/{template['id']}", json={
            "name": template["name"], "items": [{"employeeId": PETROV}], "targetEmployeeIds": []})
        assert response.status_code == 200
        assert response.json()["targets"] == []

    def test_update_unknown_template_returns_400(self, admin_api):
        response = admin_api.put("/api/respondent-templates/999999",
                                 json={"name": "x", "items": [{"employeeId": PETROV}]})
        assert response.status_code == 400

    def test_update_with_invalid_items_is_rejected(self, surveys):
        template = surveys.respondent_template()
        response = surveys.client.put(f"/api/respondent-templates/{template['id']}",
                                      json={"name": "x", "items": []})
        assert response.status_code == 400
        assert "хотя бы одного оценивающего" in message_text(response)


class TestRespondentTemplateDelete:
    def test_delete_removes_template(self, surveys):
        template = surveys.respondent_template()
        assert surveys.client.delete(f"/api/respondent-templates/{template['id']}").status_code == 204
        assert template["id"] not in [t["id"] for t in list_templates(surveys.client)]
        surveys.created_respondent_templates.remove(template["id"])

    def test_delete_unknown_template_returns_404(self, admin_api):
        assert admin_api.delete("/api/respondent-templates/999999").status_code == 404

    def test_template_in_use_cannot_break_matrix(self, surveys):
        """Удаление шаблона не должно влиять на уже созданные назначения опроса."""
        template = surveys.respondent_template()
        survey = surveys.draft()
        surveys.client.post(f"/api/surveys/{survey['id']}/matrix/apply-template",
                            json={"templateId": template["id"], "targetIds": [IVANOV]})
        rows_before = matrix_of(surveys.client, survey["id"])
        surveys.client.delete(f"/api/respondent-templates/{template['id']}")
        surveys.created_respondent_templates.remove(template["id"])
        assert matrix_of(surveys.client, survey["id"]) == rows_before


class TestApplyTemplateToSurvey:
    @pytest.mark.smoke
    def test_apply_creates_assignments_with_tokens(self, surveys):
        template = surveys.respondent_template(
            items=[{"employeeId": PETROV}, {"employeeId": IVANOVA}],
            targetEmployeeIds=[])
        survey = surveys.draft()
        response = surveys.client.post(f"/api/surveys/{survey['id']}/matrix/apply-template",
                                       json={"templateId": template["id"], "targetIds": [IVANOV]})
        assert response.status_code == 200
        body = response.json()
        assert body["created"] == 2 and body["skipped"] == 0
        assert {i["evaluatorId"] for i in body["items"]} == {PETROV, IVANOVA}
        assert all(i["token"] for i in body["items"])
        assert len(matrix_of(surveys.client, survey["id"])) == 2

    def test_apply_creates_full_cross_for_several_targets(self, surveys):
        template = surveys.respondent_template(items=[{"employeeId": PETROV},
                                                      {"employeeId": IVANOVA}],
                                               targetEmployeeIds=[])
        survey = surveys.draft()
        response = surveys.client.post(f"/api/surveys/{survey['id']}/matrix/apply-template",
                                       json={"templateId": template["id"],
                                             "targetIds": [IVANOV, ALEKSANDROVNA]})
        assert response.json()["created"] == 4

    def test_second_apply_skips_existing_pairs(self, surveys):
        template = surveys.respondent_template(items=[{"employeeId": PETROV}], targetEmployeeIds=[])
        survey = surveys.draft()
        surveys.client.post(f"/api/surveys/{survey['id']}/matrix/apply-template",
                            json={"templateId": template["id"], "targetIds": [IVANOV]})
        response = surveys.client.post(f"/api/surveys/{survey['id']}/matrix/apply-template",
                                       json={"templateId": template["id"], "targetIds": [IVANOV]})
        assert response.status_code == 200
        assert response.json() == {"created": 0, "skipped": 1, "items": []}
        assert len(matrix_of(surveys.client, survey["id"])) == 1

    def test_apply_uses_targets_embedded_in_template(self, surveys):
        template = surveys.respondent_template(items=[{"employeeId": PETROV}],
                                               targetEmployeeIds=[IVANOV])
        survey = surveys.draft()
        response = surveys.client.post(f"/api/surveys/{survey['id']}/matrix/apply-template",
                                       json={"templateId": template["id"], "targetIds": []})
        assert response.json()["created"] == 1
        assert matrix_of(surveys.client, survey["id"])[0]["targetId"] == IVANOV

    def test_explicit_target_ids_win_over_embedded(self, surveys):
        template = surveys.respondent_template(items=[{"employeeId": PETROV}],
                                               targetEmployeeIds=[IVANOV])
        survey = surveys.draft()
        surveys.client.post(f"/api/surveys/{survey['id']}/matrix/apply-template",
                            json={"templateId": template["id"], "targetIds": [ALEKSANDROVNA]})
        assert matrix_of(surveys.client, survey["id"])[0]["targetId"] == ALEKSANDROVNA

    def test_self_evaluation_pair_is_skipped(self, surveys):
        template = surveys.respondent_template(items=[{"employeeId": PETROV},
                                                      {"employeeId": IVANOV}],
                                               targetEmployeeIds=[])
        survey = surveys.draft()
        response = surveys.client.post(f"/api/surveys/{survey['id']}/matrix/apply-template",
                                       json={"templateId": template["id"], "targetIds": [IVANOV]})
        body = response.json()
        assert body["created"] == 1 and body["skipped"] == 1
        assert [i["evaluatorId"] for i in body["items"]] == [PETROV]

    def test_explicit_links_are_respected(self, surveys):
        template = surveys.respondent_template(
            items=[{"employeeId": PETROV}, {"employeeId": IVANOVA}],
            targetEmployeeIds=[IVANOV, ALEKSANDROVNA],
            links=[{"evaluatorEmployeeId": PETROV, "targetEmployeeId": IVANOV},
                   {"evaluatorEmployeeId": IVANOVA, "targetEmployeeId": ALEKSANDROVNA}])
        survey = surveys.draft()
        response = surveys.client.post(f"/api/surveys/{survey['id']}/matrix/apply-template",
                                       json={"templateId": template["id"]})
        assert response.status_code == 200
        assert response.json()["created"] == 2, "применился полный «крест», а не явные связи"

    def test_apply_to_active_survey_is_forbidden(self, surveys):
        template = surveys.respondent_template()
        setup = surveys.ready_survey(publish=False)
        surveys.publish(setup.survey_id)
        response = surveys.client.post(f"/api/surveys/{setup.survey_id}/matrix/apply-template",
                                       json={"templateId": template["id"], "targetIds": [IVANOV]})
        assert response.status_code == 400
        assert "Черновик" in message_text(response)

    def test_apply_to_unknown_survey(self, surveys):
        template = surveys.respondent_template()
        response = surveys.client.post("/api/surveys/999999/matrix/apply-template",
                                       json={"templateId": template["id"], "targetIds": [IVANOV]})
        assert response.status_code == 400
        assert "Опрос не найден" in message_text(response)

    def test_apply_without_target_fails(self, surveys):
        template = surveys.respondent_template(items=[{"employeeId": PETROV}], targetEmployeeIds=[])
        survey = surveys.draft()
        response = surveys.client.post(f"/api/surveys/{survey['id']}/matrix/apply-template",
                                       json={"templateId": template["id"], "targetIds": []})
        assert response.status_code == 400
        assert "Не указан оцениваемый" in message_text(response)

    def test_apply_unknown_template(self, surveys):
        survey = surveys.draft()
        response = surveys.client.post(f"/api/surveys/{survey['id']}/matrix/apply-template",
                                       json={"templateId": 999999, "targetIds": [IVANOV]})
        assert response.status_code == 400

    @pytest.mark.xfail(reason="ДЕФЕКТ RT-1/RT-2: seed-шаблон «Классическая 360» содержит пункт "
                              "«сам оцениваемый» (employeeId=null), но применение такого шаблона "
                              "отвергается валидацией — встроенный шаблон нерабочий", strict=False)
    def test_seed_classic_360_template_is_applicable(self, admin_api, surveys):
        survey = surveys.draft()
        response = admin_api.post(f"/api/surveys/{survey['id']}/matrix/apply-template",
                                  json={"templateId": 1, "targetIds": [IVANOV]})
        assert response.status_code == 200, message_text(response)
        assert response.json()["created"] >= 3


class TestCreateTemplateFromSurvey:
    def test_requires_survey_target_but_api_cannot_set_it(self, surveys):
        """ДЕФЕКТ RT-3: в CreateSurveyDto/UpdateSurveyDto нет TargetId, поэтому ни у одного
        опроса нельзя указать оцениваемого — эндпоинт «сохранить состав как шаблон» нерабочий."""
        setup = surveys.ready_survey(publish=False)
        response = surveys.client.post("/api/respondent-templates/from-survey",
                                       json={"surveyId": setup.survey_id, "name": "Состав опроса"})
        assert response.status_code == 400
        assert "не указан оцениваемый сотрудник" in message_text(response)

    def test_unknown_survey(self, admin_api):
        response = admin_api.post("/api/respondent-templates/from-survey",
                                  json={"surveyId": 999999, "name": "x"})
        assert response.status_code == 400
        assert "Опрос не найден" in message_text(response)

    def test_empty_name_is_rejected(self, surveys):
        setup = surveys.ready_survey(publish=False)
        response = surveys.client.post("/api/respondent-templates/from-survey",
                                       json={"surveyId": setup.survey_id, "name": ""})
        assert response.status_code == 400
        assert "Укажите название" in message_text(response)
