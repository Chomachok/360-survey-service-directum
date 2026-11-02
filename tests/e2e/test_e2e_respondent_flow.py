"""E2E: путь респондента — открытие анкеты по ссылке, валидация, отправка, статус.

Отдельного внимания заслуживают состояния «после отправки»: ссылка одноразовая,
а личный кабинет должен показать актуальный статус.
"""
from __future__ import annotations

import pytest
from helpers import RESPONDENT_EMAIL, SEED_EMPLOYEES, WEB_BASE_URL
from playwright.sync_api import Page, expect

pytestmark = [pytest.mark.e2e, pytest.mark.responses]

IVANOV = SEED_EMPLOYEES["ivanov"]
PETROV = SEED_EMPLOYEES["petrov"]


@pytest.fixture
def survey_page(sign_in, ready_survey) -> Page:
    """Анкета, открытая оценщиком (Петровым) по своей ссылке."""
    return sign_in(RESPONDENT_EMAIL, f"/survey/{ready_survey.token}")


class TestSurveyForm:
    """Открытие и заполнение анкеты."""

    @pytest.mark.smoke
    def test_link_opens_survey_with_questions(self, survey_page: Page, ready_survey):
        """Ссылка ведёт на анкету: заголовок, оцениваемый и оба вопроса."""
        expect(survey_page.get_by_role("heading", name=ready_survey.title)).to_be_visible()
        expect(survey_page.get_by_text(f"Оцениваемый: {IVANOV['fullName']}")).to_be_visible()
        expect(survey_page.get_by_text(ready_survey.choice_question["text"])).to_be_visible()
        expect(survey_page.get_by_text(ready_survey.text_question["text"])).to_be_visible()

    def test_required_question_is_marked(self, survey_page: Page, ready_survey):
        """Обязательный вопрос помечен звёздочкой, необязательный — нет."""
        required = survey_page.locator("p", has_text=ready_survey.choice_question["text"])
        expect(required.locator("span")).to_have_text("*")
        optional = survey_page.locator("p", has_text=ready_survey.text_question["text"])
        expect(optional.locator("span")).to_have_count(0)

    def test_empty_required_question_blocks_submit(self, survey_page: Page, ready_survey):
        """Отправка без ответа на обязательный вопрос не уходит на сервер."""
        survey_page.get_by_role("button", name="Отправить ответы").click()
        expect(survey_page.get_by_text("Пожалуйста, ответьте на обязательные вопросы",
                                       exact=False).first).to_be_visible()
        # вариант обязательного вопроса так и не выбран — форма осталась
        expect(survey_page.get_by_role("button", name="Отправить ответы")).to_be_visible()

    def test_successful_submit_shows_thank_you(self, survey_page: Page, ready_survey,
                                               admin_api):
        """Выбор варианта и текст уходят на сервер, анкета показывает «Спасибо!»."""
        option = ready_survey.choice_question["options"][0]
        survey_page.get_by_role("radio", name=option, exact=True).check()
        survey_page.get_by_placeholder("Введите ваш ответ...").fill("Комментарий из интерфейса")
        survey_page.get_by_role("button", name="Отправить ответы").click()

        expect(survey_page.get_by_role("heading", name="Спасибо!")).to_be_visible(timeout=15000)
        expect(survey_page.get_by_text("Ваши ответы успешно сохранены")).to_be_visible()

        results = admin_api.get(f"/api/surveys/{ready_survey.survey_id}/results").json()
        answers = [answer["answerText"] or answer["selectedOption"]
                   for employee in results["results"]
                   for evaluator in employee["evaluators"]
                   for answer in evaluator["answers"]]
        assert option in answers
        assert "Комментарий из интерфейса" in answers

    def test_used_link_reports_that_survey_is_already_passed(self, survey_page: Page,
                                                              ready_survey):
        """Одноразовая ссылка после отправки больше не даёт анкету."""
        option = ready_survey.choice_question["options"][0]
        survey_page.get_by_role("radio", name=option, exact=True).check()
        survey_page.get_by_role("button", name="Отправить ответы").click()
        expect(survey_page.get_by_role("heading", name="Спасибо!")).to_be_visible(timeout=15000)

        survey_page.goto(f"{WEB_BASE_URL}/survey/{ready_survey.token}")
        expect(survey_page.get_by_text("Опрос уже пройден", exact=False)).to_be_visible()
        expect(survey_page.get_by_role("button", name="Отправить ответы")).to_have_count(0)


class TestRespondentDashboard:
    """Личный кабинет до и после прохождения."""

    def test_card_switches_to_completed(self, survey_page: Page, ready_survey):
        """После отправки карточка становится «Завершён», кнопка прохождения исчезает."""
        option = ready_survey.choice_question["options"][0]
        survey_page.get_by_role("radio", name=option, exact=True).check()
        survey_page.get_by_role("button", name="Отправить ответы").click()
        expect(survey_page.get_by_role("heading", name="Спасибо!")).to_be_visible(timeout=15000)

        survey_page.get_by_role("link", name="Вернуться в личный кабинет").click()
        card = survey_page.locator("div.card").filter(has_text=ready_survey.title)
        expect(card.get_by_text("Завершён", exact=True)).to_be_visible(timeout=15000)
        expect(card.get_by_role("link", name="Пройти опрос")).to_have_count(0)

    def test_search_and_status_filter(self, sign_in, ready_survey):
        """Поиск оставляет одну карточку, фильтр «Завершённые» её скрывает."""
        page = sign_in(RESPONDENT_EMAIL, "/user")
        expect(page.get_by_text(ready_survey.title).first).to_be_visible(timeout=15000)

        # на странице три карточки статистики, поэтому считаем только карточку опроса
        page.get_by_placeholder("Поиск по названию...").fill(ready_survey.title)
        expect(page.locator("div.card").filter(has_text="Пройти опрос")).to_have_count(1, timeout=15000)

        page.locator("select").select_option("completed")
        expect(page.get_by_text("Нет опросов, соответствующих фильтрам")).to_be_visible()


class TestResultsExport:
    """Кнопка «Экспорт DOCX» на странице результатов."""

    @pytest.mark.xfail(reason="ДЕФЕКТ RES-4: экспорт открывается window.open без JWT-заголовка, "
                              "backend отдаёт 401 — пользователь видит пустую вкладку вместо файла",
                       strict=False)
    def test_export_downloads_docx(self, admin_page: Page, ready_survey, respondent_api):
        # ответ респондента через API, чтобы на странице результатов появилась кнопка экспорта
        respondent_api.post(f"/api/public/{ready_survey.token}/answers",
                            json={"answers": ready_survey.answers()}).raise_for_status()

        page = admin_page
        page.goto(f"{WEB_BASE_URL}/survey/{ready_survey.survey_id}/results")
        expect(page.get_by_text(ready_survey.title).first).to_be_visible(timeout=15000)

        with page.expect_download(timeout=15000) as download_info:
            page.get_by_role("button", name="Экспорт DOCX").click()
        download = download_info.value
        assert download.suggested_filename.lower().endswith(".docx")
