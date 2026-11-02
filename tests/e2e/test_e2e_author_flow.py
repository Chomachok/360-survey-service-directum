"""E2E: путь автора в интерфейсе — публикация, матрица, отзывы, завершение.

Проверяет то, что невозможно увидеть в API-тестах: порядок экранов, блокировки
по статусу и связь UI с реальными эндпоинтами.
"""
from __future__ import annotations

import pytest
from conftest import matrix_list_mode, pick_employee, switch_to_list_view
from helpers import RESPONDENT_EMAIL, SEED_EMPLOYEES, WEB_BASE_URL
from playwright.sync_api import Page, expect

pytestmark = [pytest.mark.e2e, pytest.mark.regression]

IVANOV = SEED_EMPLOYEES["ivanov"]
PETROV = SEED_EMPLOYEES["petrov"]


def _create_survey(page: Page, title: str, dates: tuple[str, str]) -> int:
    """Создаёт черновик из UI и возвращает id из адреса страницы вопросов."""
    page.goto(f"{WEB_BASE_URL}/survey/new")
    page.get_by_placeholder("Например: Оценка эффективности команды").fill(title)
    page.get_by_placeholder("Опишите цель и задачи опроса...").fill("Проверка пути автора")
    date_fields = page.locator("input[type='datetime-local']")
    date_fields.nth(0).fill(dates[0])
    date_fields.nth(1).fill(dates[1])
    page.get_by_role("button", name="Создать опрос").click()
    page.wait_for_url("**/survey/*/questions", wait_until="commit")
    return int(page.url.split("/survey/")[1].split("/")[0])


def _add_text_question(page: Page, text: str) -> None:
    """Добавляет текстовый вопрос через форму QuestionBuilder."""
    page.get_by_placeholder("Введите текст вопроса").fill(text)
    page.get_by_role("button", name="Добавить вопрос").click()
    expect(page.get_by_text("Вопрос добавлен", exact=False).first).to_be_visible(timeout=15000)


def _find_survey(page: Page, title: str) -> None:
    """Находит карточку опроса на дашборде через поиск."""
    page.goto(f"{WEB_BASE_URL}/")
    page.get_by_placeholder("Поиск по названию...").fill(title)
    page.wait_for_timeout(800)


def _confirm_action(page: Page, modal_title: str, action: str) -> None:
    """Подтверждает действие в модальном окне (ConfirmModal) дашборда.

    Модалки ConfirmModal открываются поверх страницы; каждая имеет заголовок h3.
    """
    modal = page.locator(
        "div[class*='inset-0'].z-50", has=page.locator("h3", has_text=modal_title)
    )
    expect(modal).to_be_visible()
    modal.get_by_role("button", name=action, exact=True).click()


class TestPublishFromUi:
    """Публикация меняет статус и блокирует редактирование."""

    def test_publish_locks_matrix_and_shows_active_status(
        self, admin_page: Page, admin_api, future_dates, created_survey_ids, toast, unique_title
    ):
        title = unique_title("E2E публикация из интерфейса")
        page = admin_page
        survey_id = _create_survey(page, title, future_dates)
        created_survey_ids.append(survey_id)

        _find_survey(page, title)
        # Кнопка на карточке — иконка Rocket, имя из title атрибута
        page.get_by_title("Опубликовать опрос").first.click()
        _confirm_action(page, "Публикация опроса", "Опубликовать")
        toast("Опрос успешно опубликован!")
        expect(page.get_by_text("Активен", exact=True).first).to_be_visible()
        assert admin_api.get(f"/api/surveys/{survey_id}").json()["status"] == "Active"

        # форма добавления связей исчезает: она только для черновика
        page.goto(f"{WEB_BASE_URL}/survey/{survey_id}/matrix")
        expect(page.get_by_text("Добавление участников доступно только для опросов")).to_be_visible()

    def test_published_survey_rejects_new_question_from_ui(
        self, admin_page: Page, future_dates, created_survey_ids, unique_title
    ):
        """После публикации форма вопросов блокируется."""
        title = unique_title("E2E вопросы после публикации")
        page = admin_page
        survey_id = _create_survey(page, title, future_dates)
        created_survey_ids.append(survey_id)

        _find_survey(page, title)
        page.get_by_title("Опубликовать опрос").first.click()
        _confirm_action(page, "Публикация опроса", "Опубликовать")

        page.goto(f"{WEB_BASE_URL}/survey/{survey_id}/questions")
        expect(page.get_by_text("Добавление вопросов недоступно")).to_be_visible()


class TestFullAuthorJourney:
    """Сквозной сценарий: создание → вопрос → матрица → публикация → ответ → завершение."""

    def test_author_journey_collects_response(
        self, admin_page: Page, admin_api, respondent_api, future_dates,
        created_survey_ids, toast, unique_title
    ):
        title = unique_title("E2E полный путь автора")
        page = admin_page

        survey_id = _create_survey(page, title, future_dates)
        created_survey_ids.append(survey_id)
        _add_text_question(page, "Как коллега справляется с задачами?")

        # матрица: Петров (оценщик) оценивает Иванову (оцениваемый)
        page.goto(f"{WEB_BASE_URL}/survey/{survey_id}/matrix")
        matrix_list_mode(page)
        pick_employee(page, IVANOV["fullName"], 1)
        pick_employee(page, PETROV["fullName"], 2)
        page.get_by_role("button", name="Добавить", exact=True).click()
        expect(page.get_by_role("button", name="Копировать ссылку")).to_be_visible(timeout=15000)
        expect(page.get_by_text("Ожидает", exact=True)).to_be_visible()

        # публикация — ссылка становится рабочей
        _find_survey(page, title)
        page.get_by_title("Опубликовать опрос").first.click()
        _confirm_action(page, "Публикация опроса", "Опубликовать")
        toast("Опрос успешно опубликован!")

        # токен берём из API (UI «Копировать ссылку» копирует в буфер — нестабильно в CI)
        matrix_items = admin_api.get(f"/api/surveys/{survey_id}/matrix").json()
        assert len(matrix_items) >= 1
        token = matrix_items[0]["token"]

        # респондент проходит опрос в собственном контексте: localStorage общий для
        # контекста, поэтому страница оценщика не должна мешать админской сессии
        respondent_page = _open_as_respondent(page.context.browser, respondent_api, token)
        expect(respondent_page.get_by_text("Как коллега справляется с задачами?")).to_be_visible()
        respondent_page.get_by_placeholder("Введите ваш ответ...").fill("Справляется хорошо")
        respondent_page.get_by_role("button", name="Отправить ответы").click()
        expect(respondent_page.get_by_text("Спасибо!", exact=False)).to_be_visible(timeout=15000)
        respondent_page.context.close()

        # матрица показывает заполнение
        page.goto(f"{WEB_BASE_URL}/survey/{survey_id}/matrix")
        switch_to_list_view(page)
        expect(page.get_by_text("Завершено", exact=True)).to_be_visible(timeout=15000)

        # автор видит ответ: карточка оцениваемого и вопрос раскрываются кликом
        page.goto(f"{WEB_BASE_URL}/survey/{survey_id}/results")
        page.get_by_text(IVANOV["fullName"], exact=False).first.click()
        page.get_by_text("Как коллега справляется с задачами?").first.click()
        expect(page.get_by_text("Справляется хорошо", exact=False).first).to_be_visible(timeout=15000)
        expect(page.get_by_text(PETROV["fullName"], exact=False).first).to_be_visible()

        # досрочное завершение
        _find_survey(page, title)
        page.get_by_title("Досрочно завершить опрос").first.click()
        _confirm_action(page, "Завершение опроса", "Завершить")
        toast("Опрос успешно завершён!")
        expect(page.get_by_text("Завершён", exact=True).first).to_be_visible()
        assert admin_api.get(f"/api/surveys/{survey_id}").json()["status"] == "Completed"


class TestDeleteLink:
    """Удаление связи матрицы из интерфейса."""

    def test_delete_link_empties_matrix(self, admin_page: Page, admin_api, future_dates,
                                        created_survey_ids, toast, unique_title):
        title = unique_title("E2E удаление связи")
        page = admin_page
        survey_id = _create_survey(page, title, future_dates)
        created_survey_ids.append(survey_id)

        page.goto(f"{WEB_BASE_URL}/survey/{survey_id}/matrix")
        matrix_list_mode(page)
        pick_employee(page, PETROV["fullName"], 1)
        pick_employee(page, IVANOV["fullName"], 2)
        page.get_by_role("button", name="Добавить", exact=True).click()
        expect(page.get_by_role("button", name="Копировать ссылку")).to_be_visible(timeout=15000)

        # Удалить связь — кнопка с title (иконка корзины)
        page.get_by_title("Удалить связь").first.click()
        _confirm_action(page, "Удаление связи", "Удалить")
        toast("Связь удалена")
        expect(page.get_by_text("Матрица пуста")).to_be_visible(timeout=15000)
        assert admin_api.get(f"/api/surveys/{survey_id}/matrix").json() == []


class TestRespondentView:
    """Респондент видит только свои опросы и может их пройти."""

    def test_respondent_dashboard_lists_assigned_survey(
        self, browser, respondent_api, surveys, unique_title
    ):
        """Ссылка из матрицы появляется в личном кабинете респондента."""
        title = unique_title("E2E кабинет респондента")
        surveys.ready_survey(title=title)
        page = browser.new_page()
        page.goto(f"{WEB_BASE_URL}/login")
        page.evaluate(
            """([token, name, email]) => {
                localStorage.setItem('authToken', token);
                localStorage.setItem('userName', name);
                localStorage.setItem('userEmail', email);
                localStorage.setItem('isAdmin', 'false');
            }""",
            [respondent_api.token, PETROV["fullName"], RESPONDENT_EMAIL],
        )
        page.goto(f"{WEB_BASE_URL}/user")
        expect(page.get_by_text(title).first).to_be_visible(timeout=15000)

        page.get_by_role("link", name="Пройти опрос").first.click()
        page.wait_for_url("**/survey/*")
        expect(page.get_by_role("button", name="Отправить ответы")).to_be_visible()
        page.close()


# ---------------------------------------------------------------------------
def _open_as_respondent(browser, respondent_api, token: str) -> Page:
    """Открывает анкету под респондентом в отдельном контексте браузера."""
    from conftest import jwt_claims
    context = browser.new_context()
    page = context.new_page()
    page.goto(f"{WEB_BASE_URL}/login")
    claims = jwt_claims(respondent_api.token)
    page.evaluate(
        """([token, name, email]) => {
            localStorage.setItem('authToken', token);
            localStorage.setItem('userName', name);
            localStorage.setItem('userEmail', email);
            localStorage.setItem('isAdmin', 'false');
        }""",
        [respondent_api.token, claims.get("unique_name", ""), RESPONDENT_EMAIL],
    )
    page.goto(f"{WEB_BASE_URL}/survey/{token}")
    return page
