"""API-тесты результатов опроса: агрегация ответов, группировка, экспорт в DOCX."""
from __future__ import annotations

import io
import zipfile

import pytest

from helpers import SEED_EMPLOYEES, message_text

pytestmark = [pytest.mark.api, pytest.mark.results, pytest.mark.regression]

PETROV = SEED_EMPLOYEES["petrov"]["id"]
IVANOVA = SEED_EMPLOYEES["ivanova"]["id"]
IVANOV = SEED_EMPLOYEES["ivanov"]["id"]
ALEKSANDROVNA = SEED_EMPLOYEES["aleksandrovna"]["id"]

DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


def docx_text(content: bytes) -> str:
    """Достаёт текст документа из .docx (zip с word/document.xml)."""
    with zipfile.ZipFile(io.BytesIO(content)) as archive:
        with archive.open("word/document.xml") as document:
            raw = document.read().decode("utf-8")
    return raw


def evaluators_of(results: dict, employee_name: str) -> list[dict]:
    employee = next(e for e in results["results"] if e["employeeName"] == employee_name)
    return employee["evaluators"]


class TestResultsContract:
    @pytest.mark.smoke
    def test_results_shape(self, surveys, admin_api, respondent_api):
        setup = surveys.ready_survey()
        respondent_api.post(f"/api/public/{setup.token}/answers", json={"answers": setup.answers()})
        response = admin_api.get(f"/api/surveys/{setup.survey_id}/Results")
        assert response.status_code == 200
        body = response.json()
        assert set(body) == {"surveyId", "surveyTitle", "results"}
        assert body["surveyId"] == setup.survey_id
        assert body["surveyTitle"] == setup.title
        employee = body["results"][0]
        assert set(employee) == {"employeeId", "employeeName", "evaluators"}
        evaluator = employee["evaluators"][0]
        assert set(evaluator) == {"evaluatorId", "evaluatorName", "answers"}
        assert all(set(a) == {"questionText", "answerText", "selectedOption"}
                   for a in evaluator["answers"])

    def test_survey_without_answers_has_empty_results(self, surveys):
        survey = surveys.draft()
        surveys.publish(survey["id"])
        body = surveys.client.get(f"/api/surveys/{survey['id']}/Results").json()
        assert body["results"] == []

    def test_unanswered_assignment_is_excluded(self, surveys):
        setup = surveys.ready_survey(evaluator_ids=(PETROV, IVANOVA))
        body = surveys.client.get(f"/api/surveys/{setup.survey_id}/Results").json()
        assert body["results"] == []

    def test_only_completed_assignments_appear(self, surveys, respondent_api):
        setup = surveys.ready_survey(evaluator_ids=(PETROV, IVANOVA))
        respondent_api.post(f"/api/public/{setup.token_for(PETROV)}/answers",
                            json={"answers": setup.answers()})
        body = surveys.client.get(f"/api/surveys/{setup.survey_id}/Results").json()
        names = [e["evaluatorName"] for e in evaluators_of(body, SEED_EMPLOYEES["ivanov"]["fullName"])]
        assert names == [SEED_EMPLOYEES["petrov"]["fullName"]]

    def test_all_questions_are_listed_even_without_answer(self, surveys, respondent_api):
        setup = surveys.ready_survey()
        choice = setup.choice_question
        respondent_api.post(f"/api/public/{setup.token}/answers",
                            json={"answers": [{"questionId": choice["id"], "selectedOption": "Хорошо"}]})
        answers = evaluators_of(
            surveys.client.get(f"/api/surveys/{setup.survey_id}/Results").json(),
            SEED_EMPLOYEES["ivanov"]["fullName"])[0]["answers"]
        assert [a["questionText"] for a in answers] == [q["text"] for q in setup.questions]
        assert answers[1] == {"questionText": setup.text_question["text"],
                              "answerText": None, "selectedOption": None}

    def test_results_are_grouped_by_evaluated_employee(self, surveys, respondent_api, ivanova_api):
        survey = surveys.draft()
        surveys.add_question(survey["id"], text="Оцените качество работы", type="Text",
                             required=True, order=1)
        first = surveys.add_matrix_item(survey["id"], PETROV, IVANOV)
        second = surveys.add_matrix_item(survey["id"], IVANOVA, ALEKSANDROVNA)
        surveys.publish(survey["id"])
        answers = [{"questionId": surveys.questions(survey["id"])[0]["id"],
                    "textAnswer": "норм"}]
        respondent_api.post(f"/api/public/{first['token']}/answers", json={"answers": answers})
        ivanova_api.post(f"/api/public/{second['token']}/answers", json={"answers": answers})

        body = surveys.client.get(f"/api/surveys/{survey['id']}/Results").json()
        grouped = {e["employeeName"]: [ev["evaluatorName"] for ev in e["evaluators"]]
                   for e in body["results"]}
        assert grouped == {
            SEED_EMPLOYEES["ivanov"]["fullName"]: [SEED_EMPLOYEES["petrov"]["fullName"]],
            SEED_EMPLOYEES["aleksandrovna"]["fullName"]: [SEED_EMPLOYEES["ivanova"]["fullName"]],
        }

    def test_self_assessment_appears_as_regular_evaluator(self, surveys, ivanov_api):
        survey = surveys.draft()
        question = surveys.add_question(survey["id"], text="Самооценка", type="Text",
                                        required=True, order=1)
        item = surveys.add_matrix_item(survey["id"], IVANOV, IVANOV)
        surveys.publish(survey["id"])
        ivanov_api.post(f"/api/public/{item['token']}/answers",
                        json={"answers": [{"questionId": question["id"], "textAnswer": "я хорош"}]})
        evaluators = evaluators_of(
            surveys.client.get(f"/api/surveys/{survey['id']}/Results").json(),
            SEED_EMPLOYEES["ivanov"]["fullName"])
        assert evaluators[0]["evaluatorId"] == IVANOV

    def test_results_of_unknown_survey(self, admin_api):
        response = admin_api.get("/api/surveys/999999/Results")
        assert response.status_code == 404
        assert "Survey not found" in message_text(response)

    def test_results_are_available_for_draft_survey(self, surveys):
        """Результаты черновика доступны (пустые) — отдельной защиты от чтения нет."""
        survey = surveys.draft()
        assert surveys.client.get(f"/api/surveys/{survey['id']}/Results").status_code == 200

    def test_results_are_available_after_completion(self, surveys, admin_api, respondent_api):
        setup = surveys.ready_survey()
        respondent_api.post(f"/api/public/{setup.token}/answers", json={"answers": setup.answers()})
        surveys.complete(setup.survey_id)
        body = admin_api.get(f"/api/surveys/{setup.survey_id}/Results").json()
        assert len(body["results"]) == 1

    @pytest.mark.xfail(reason="ДЕФЕКТ RES-1: результаты не содержат ни id ответа, ни id вопроса — "
                              "UI не может отфильтровать/подсветить конкретный ответ", strict=False)
    def test_answers_should_carry_question_id(self, surveys, admin_api, respondent_api):
        setup = surveys.ready_survey()
        respondent_api.post(f"/api/public/{setup.token}/answers", json={"answers": setup.answers()})
        answers = evaluators_of(
            admin_api.get(f"/api/surveys/{setup.survey_id}/Results").json(),
            SEED_EMPLOYEES["ivanov"]["fullName"])[0]["answers"]
        assert {"questionId", "answerId"} <= set(answers[0])


class TestDocxExport:
    @pytest.mark.smoke
    def test_export_returns_valid_docx(self, surveys, admin_api, respondent_api):
        setup = surveys.ready_survey()
        respondent_api.post(f"/api/public/{setup.token}/answers", json={"answers": setup.answers()})
        response = admin_api.get(f"/api/surveys/{setup.survey_id}/Results/export/docx")
        assert response.status_code == 200
        assert response.headers["Content-Type"].startswith(DOCX_MIME)
        assert response.content[:2] == b"PK"
        with zipfile.ZipFile(io.BytesIO(response.content)) as archive:
            assert "word/document.xml" in archive.namelist()

    def test_export_file_name_is_ascii_safe(self, surveys, admin_api):
        """ДЕФЕКТ RES-2: имя файла с кириллицей и пробелом отдаётся в Content-Disposition
        без корректного filename* — браузеры/клиенты могут обрезать его."""
        setup = surveys.ready_survey()
        response = admin_api.get(f"/api/surveys/{setup.survey_id}/Results/export/docx")
        disposition = response.headers.get("Content-Disposition", "")
        assert "filename*" in disposition, f"нет кодированного имени файла: {disposition}"

    def test_export_contains_survey_data(self, surveys, admin_api, respondent_api):
        setup = surveys.ready_survey()
        respondent_api.post(f"/api/public/{setup.token}/answers", json={"answers": setup.answers()})
        text = docx_text(admin_api.get(
            f"/api/surveys/{setup.survey_id}/Results/export/docx").content)
        assert setup.title in text
        assert SEED_EMPLOYEES["ivanov"]["fullName"] in text
        assert SEED_EMPLOYEES["petrov"]["fullName"] in text
        assert setup.choice_question["text"] in text
        assert "Отлично" in text
        assert "Автоматический комментарий" in text

    def test_export_of_empty_survey_says_no_data(self, surveys, admin_api):
        survey = surveys.draft()
        admin_api.post(f"/api/surveys/{survey['id']}/publish")
        text = docx_text(admin_api.get(f"/api/surveys/{survey['id']}/Results/export/docx").content)
        assert "Нет данных для отображения" in text

    def test_export_marks_missing_answers(self, surveys, admin_api, respondent_api):
        setup = surveys.ready_survey()
        respondent_api.post(f"/api/public/{setup.token}/answers",
                            json={"answers": [{"questionId": setup.choice_question["id"],
                                               "selectedOption": "Плохо"}]})
        text = docx_text(admin_api.get(
            f"/api/surveys/{setup.survey_id}/Results/export/docx").content)
        assert "Нет ответа" in text

    def test_export_of_unknown_survey(self, admin_api):
        response = admin_api.get("/api/surveys/999999/Results/export/docx")
        assert response.status_code == 500, "ожидали 404 для несуществующего опроса"
        assert "Survey not found" in message_text(response)

    @pytest.mark.xfail(reason="ДЕФЕКТ RES-3: экспорт несуществующего опроса не перехватывается "
                              "в контроллере и отдаёт 500 вместо 404", strict=False)
    def test_export_of_unknown_survey_should_be_404(self, admin_api):
        assert admin_api.get("/api/surveys/999999/Results/export/docx").status_code == 404

    def test_export_survives_long_and_special_answers(self, surveys, admin_api, respondent_api):
        setup = surveys.ready_survey()
        respondent_api.post(f"/api/public/{setup.token}/answers", json={"answers": [
            {"questionId": setup.choice_question["id"], "selectedOption": "Отлично"},
            {"questionId": setup.text_question["id"],
             "textAnswer": "Символы <&>\n" + "Д" * 3000},
        ]})
        response = admin_api.get(f"/api/surveys/{setup.survey_id}/Results/export/docx")
        assert response.status_code == 200
        assert len(response.content) > 1000
