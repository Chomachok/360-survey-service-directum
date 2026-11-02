"""API-тесты прохождения опроса респондентом и коллекций ответов."""
from __future__ import annotations

import pytest

from helpers import SEED_EMPLOYEES, message_text

pytestmark = [pytest.mark.api, pytest.mark.responses, pytest.mark.regression]

PETROV = SEED_EMPLOYEES["petrov"]["id"]
IVANOVA = SEED_EMPLOYEES["ivanova"]["id"]
IVANOV = SEED_EMPLOYEES["ivanov"]["id"]

BAD_TOKEN = "00000000-0000-4000-8000-000000000000"

# ready_survey создаёт назначение PETROV → IVANOV. По фиксу RESP-6
# (commit 9be4017) персональную ссылку может открывать/заполнять только
# сам PETROV. Поэтому во всех вызовах /api/public — login_as("petrov"),
# а не admin_api. admin_api остаётся только для чтения матрицы/результатов
# и для настройки опроса.


def open_survey(client, token: str):
    return client.get(f"/api/public/{token}")


def submit(client, token: str, answers: list[dict]):
    return client.post(f"/api/public/{token}/answers", json={"answers": answers})


def results_of(client, survey_id: int) -> dict:
    return client.get(f"/api/surveys/{survey_id}/results").json()


def evaluator_answers(client, survey_id: int, evaluator_name: str) -> dict[str, dict]:
    for employee in results_of(client, survey_id)["results"]:
        for evaluator in employee["evaluators"]:
            if evaluator["evaluatorName"] == evaluator_name:
                return {a["questionText"]: a for a in evaluator["answers"]}
    raise AssertionError(f"оценщик {evaluator_name} не найден в результатах")


class TestOpenSurveyByToken:
    @pytest.mark.smoke
    def test_respondent_sees_questions(self, ready_survey, login_as):
        response = open_survey(login_as("petrov"), ready_survey.token)
        assert response.status_code == 200
        body = response.json()
        assert body["surveyId"] == ready_survey.survey_id
        assert body["surveyTitle"] == ready_survey.title
        assert body["targetName"] == SEED_EMPLOYEES["ivanov"]["fullName"]
        assert [q["id"] for q in body["questions"]] == [q["id"] for q in ready_survey.questions]

    def test_options_and_required_flag_are_exposed(self, ready_survey, login_as):
        body = open_survey(login_as("petrov"), ready_survey.token).json()
        choice = body["questions"][0]
        assert choice["type"] == "SingleChoice"
        assert choice["required"] is True
        assert choice["options"] == ["Отлично", "Хорошо", "Плохо"]
        assert body["questions"][1]["options"] == []

    def test_draft_survey_is_not_accessible(self, surveys, login_as):
        survey = surveys.draft()
        item = surveys.add_matrix_item(survey["id"], PETROV, IVANOV)
        response = open_survey(login_as("petrov"), item["token"])
        assert response.status_code == 400
        assert "не активен" in message_text(response)

    def test_completed_assignment_is_not_accessible_again(self, ready_survey, login_as):
        petrov = login_as("petrov")
        submit(petrov, ready_survey.token, ready_survey.answers())
        response = open_survey(petrov, ready_survey.token)
        assert response.status_code == 400
        assert "уже пройден" in message_text(response)

    def test_unknown_token_returns_204_instead_of_404(self, respondent_api):
        """ДЕФЕКТ RESP-1: несуществующая ссылка даёт 204 No Content без тела —
        фронтенд не может показать внятную ошибку «ссылка недействительна»."""
        response = open_survey(respondent_api, BAD_TOKEN)
        assert response.status_code == 204
        assert response.text == ""

    @pytest.mark.xfail(reason="ДЕФЕКТ RESP-1: невалидный токен должен отвечать 404 с текстом ошибки",
                       strict=False)
    def test_unknown_token_should_be_404(self, respondent_api):
        assert open_survey(respondent_api, BAD_TOKEN).status_code == 404


class TestSubmitAnswers:
    @pytest.mark.smoke
    def test_valid_answers_are_saved_and_mark_assignment_done(self, ready_survey, admin_api, login_as):
        response = submit(login_as("petrov"), ready_survey.token, ready_survey.answers())
        assert response.status_code == 200
        rows = respondent_api.get(f"/api/surveys/{ready_survey.survey_id}/matrix").json()
        assert rows[0]["completed"] is True
        assert rows[0]["token"] == ready_survey.token

    def test_answers_are_read_back_from_results(self, ready_survey, admin_api, login_as):
        submit(login_as("petrov"), ready_survey.token, ready_survey.answers())
        answers = evaluator_answers(admin_api, ready_survey.survey_id,
                                   SEED_EMPLOYEES["petrov"]["fullName"])
        assert answers[ready_survey.choice_question["text"]]["selectedOption"] == "Отлично"
        assert answers[ready_survey.text_question["text"]]["answerText"] == "Автоматический комментарий"

    def test_only_required_answer_is_enough_to_submit(self, ready_survey, login_as):
        choice = ready_survey.choice_question
        response = submit(login_as("petrov"), ready_survey.token,
                          [{"questionId": choice["id"], "selectedOption": "Хорошо"}])
        assert response.status_code == 200

    def test_optional_question_stays_unanswered_in_results(self, ready_survey, admin_api, login_as):
        choice = ready_survey.choice_question
        submit(login_as("petrov"), ready_survey.token,
               [{"questionId": choice["id"], "selectedOption": "Хорошо"}])
        answers = evaluator_answers(respondent_api, ready_survey.survey_id,
                                   SEED_EMPLOYEES["petrov"]["fullName"])
        assert answers[ready_survey.text_question["text"]] == {
            "questionText": ready_survey.text_question["text"],
            "answerText": None, "selectedOption": None}

    def test_missing_required_answer_is_rejected(self, ready_survey, login_as):
        choice = ready_survey.choice_question
        text = ready_survey.text_question
        response = submit(login_as("petrov"), ready_survey.token,
                          [{"questionId": choice["id"], "selectedOption": ""},
                           {"questionId": text["id"], "textAnswer": "только текст"}])
        assert response.status_code == 400
        assert f"Question {choice['id']} is required" in message_text(response)

    def test_repeated_submit_is_rejected(self, ready_survey, login_as):
        petrov = login_as("petrov")
        submit(petrov, ready_survey.token, ready_survey.answers())
        again = submit(petrov, ready_survey.token, ready_survey.answers())
        assert again.status_code == 400
        assert "Already submitted" in message_text(again)

    def test_unknown_question_is_rejected(self, ready_survey, login_as):
        response = submit(login_as("petrov"), ready_survey.token,
                          [{"questionId": 999_999, "selectedOption": "x"}])
        assert response.status_code == 400
        assert "Question not found" in message_text(response)

    def test_question_of_another_survey_is_accepted(self, surveys, ready_survey, admin_api, login_as):
        """ДЕФЕКТ RESP-2: принадлежность вопроса опросу не проверяется — ответ можно
        «прицепить» к вопросу другого опроса."""
        other = surveys.draft(title="Другой опрос")
        foreign = surveys.add_question(other["id"], text="Чужой вопрос", type="Text", required=True)
        response = submit(login_as("petrov"), ready_survey.token,
                          [{"questionId": foreign["id"], "textAnswer": "не мой ответ"}])
        assert response.status_code == 200
        assert foreign["text"] not in evaluator_answers(
            admin_api, ready_survey.survey_id, SEED_EMPLOYEES["petrov"]["fullName"])

    def test_empty_answer_list_still_completes_assignment(self, ready_survey, admin_api, login_as):
        """ДЕФЕКТ RESP-3: опрос засчитывается пройденным без единого ответа."""
        assert submit(login_as("petrov"), ready_survey.token, []).status_code == 200
        rows = admin_api.get(f"/api/surveys/{ready_survey.survey_id}/matrix").json()
        assert rows[0]["completed"] is True

    @pytest.mark.xfail(reason="ДЕФЕКТ RESP-3: сервер обязан требовать ответы на обязательные вопросы",
                       strict=False)
    def test_empty_answer_list_should_be_rejected(self, ready_survey, login_as):
        assert submit(login_as("petrov"), ready_survey.token, []).status_code == 400

    def test_duplicate_answers_for_one_question_are_saved(self, ready_survey, admin_api, login_as):
        """ДЕФЕКТ RESP-4: дубли по одному вопросу не отсекаются, в результатах виден только первый."""
        choice = ready_survey.choice_question
        assert submit(login_as("petrov"), ready_survey.token, [
            {"questionId": choice["id"], "selectedOption": "Отлично"},
            {"questionId": choice["id"], "selectedOption": "Плохо"},
        ]).status_code == 200
        answers = evaluator_answers(respondent_api, ready_survey.survey_id,
                                   SEED_EMPLOYEES["petrov"]["fullName"])
        assert answers[choice["text"]]["selectedOption"] == "Отлично"

    @pytest.mark.parametrize("text", [
        "Кириллица и символы: «ёлочки», ё, 1234567890",
        "Спецсимволы <>&\"' и перевод\nстроки",
        "Д" * 4000,
    ])
    def test_free_text_is_stored_verbatim(self, ready_survey, admin_api, login_as, text):
        choice, free = ready_survey.questions
        submit(login_as("petrov"), ready_survey.token, [
            {"questionId": choice["id"], "selectedOption": "Отлично"},
            {"questionId": free["id"], "textAnswer": text},
        ])
        answers = evaluator_answers(respondent_api, ready_survey.survey_id,
                                   SEED_EMPLOYEES["petrov"]["fullName"])
        assert answers[free["text"]]["answerText"] == text


class TestAnswersIsolation:
    def test_each_evaluator_has_own_assignment(self, surveys, admin_api, login_as):
        setup = surveys.ready_survey(evaluator_ids=(PETROV, IVANOVA))
        submit(login_as("petrov"), setup.token_for(PETROV), setup.answers())
        rows = admin_api.get(f"/api/surveys/{setup.survey_id}/matrix").json()
        assert {r["evaluatorId"]: r["completed"] for r in rows} == {PETROV: True, IVANOVA: False}
        assert open_survey(login_as("ivanova"), setup.token_for(IVANOVA)).status_code == 200

    def test_answers_of_two_evaluators_both_reach_results(self, surveys, admin_api, login_as):
        setup = surveys.ready_survey(evaluator_ids=(PETROV, IVANOVA))
        submit(login_as("petrov"),  setup.token_for(PETROV),  setup.answers(selectedOption="Отлично"))
        submit(login_as("ivanova"), setup.token_for(IVANOVA), setup.answers(selectedOption="Плохо"))
        employee = results_of(admin_api, setup.survey_id)["results"][0]
        assert employee["employeeName"] == SEED_EMPLOYEES["ivanov"]["fullName"]
        collected = {e["evaluatorName"]: e["answers"] for e in employee["evaluators"]}
        assert set(collected) == {SEED_EMPLOYEES["petrov"]["fullName"],
                                 SEED_EMPLOYEES["ivanova"]["fullName"]}
        petrov_choice = next(a for a in collected[SEED_EMPLOYEES["petrov"]["fullName"]]
                            if a["questionText"] == setup.choice_question["text"])
        ivanova_choice = next(a for a in collected[SEED_EMPLOYEES["ivanova"]["fullName"]]
                             if a["questionText"] == setup.choice_question["text"])
        assert (petrov_choice["selectedOption"], ivanova_choice["selectedOption"]) == ("Отлично", "Плохо")


class TestPublicAccessWithoutLogin:
    def test_anonymous_respondent_is_blocked_today(self, ready_survey, api):
        """ДЕФЕКТ RESP-5: `RequireAuthorization()` в Program.cs распространяется и на
        /api/public — ссылка из письма-приглашения не работает без предварительного входа."""
        assert open_survey(api, ready_survey.token).status_code == 401
        assert submit(api, ready_survey.token, ready_survey.answers()).status_code == 401

    @pytest.mark.xfail(reason="ДЕФЕКТ RESP-5: публичный опрос должен быть доступен по токену без JWT",
                       strict=False)
    def test_anonymous_respondent_should_be_able_to_pass_survey(self, ready_survey, api):
        assert open_survey(api, ready_survey.token).status_code == 200
        assert submit(api, ready_survey.token, ready_survey.answers()).status_code == 200

    def test_someone_elses_token_is_rejected(self, surveys, login_as):
        """RESP-6 (fixed, 9be4017): ответ по чужому токену отклоняется 400 —
        личность оценивающего сверяется с владельцем токена."""
        setup = surveys.ready_survey(evaluator_ids=(IVANOVA,))
        response = submit(login_as("petrov"), setup.token_for(IVANOVA), setup.answers())
        assert response.status_code == 400, (
            f"чужой токен принят: {response.status_code} {response.text}"
        )
        rows = surveys.client.get(f"/api/surveys/{setup.survey_id}/matrix").json()
        assert rows[0]["completed"] is False, "чужой токен позволил пройти опрос за Иванову"


class TestAnswersAfterSurveyCompleted:
    def test_answers_are_still_accepted_after_completion(self, surveys, login_as):
        """ДЕФЕКТ RESP-7: текст подтверждения в UI обещает, что после завершения
        респонденты не смогут оставлять ответы, но API принимает их.

        В истории коммитов нет фикса RESP-7, поэтому ожидаем, что баг ещё есть.
        Если этот тест начнёт падать с 400 — значит RESP-7 починили,
        и его надо инвертировать в test_answers_are_rejected_after_completion.
        """
        setup = surveys.ready_survey()
        petrov = login_as("petrov")
        surveys.complete(setup.survey_id)
        response = submit(petrov, setup.token, setup.answers())
        assert response.status_code == 200, (
            f"ожидали, что RESP-7 ещё не починен (submit принят), "
            f"получили {response.status_code}: {response.text[:200]}"
        )

    @pytest.mark.xfail(reason="ДЕФЕКТ RESP-7: после перевода опроса в «Завершён» приём ответов должен быть закрыт",
                       strict=False)
    def test_answers_after_completion_should_be_rejected(self, surveys, login_as):
        setup = surveys.ready_survey()
        petrov = login_as("petrov")
        surveys.complete(setup.survey_id)
        assert submit(petrov, setup.token, setup.answers()).status_code == 400
        