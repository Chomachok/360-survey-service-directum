"""E2E: страница входа и маршрутизация по правам (Playwright + реальный бэкенд).

Проверяем то, что нельзя увидеть из API-тестов: форма кода, редиректы,
разделение «админская» и «респондентская» части интерфейса.
"""
from __future__ import annotations

import re

import pytest
from helpers import ADMIN_EMAIL, RESPONDENT_EMAIL, now_utc
from playwright.sync_api import Page, expect

pytestmark = [pytest.mark.e2e, pytest.mark.auth]


def expect_personal_office(page: Page) -> None:
    """Личный кабинет респондента опознаём по адресу и шапке, а не по заголовку.

    `UserDashboard` при пустом списке опросов делает ранний return с текстом
    «У вас пока нет назначенных опросов» — заголовок «Мои опросы» в этом случае
    не рендерится (frontend/src/pages/UserDashboard.tsx:69-86). Поэтому проверка
    заголовка проходила только на «грязной» dev-базе, где у Петрова уже были
    назначения от прошлых прогонов, и падала в CI на чистой базе.
    """
    expect(page).to_have_url(re.compile(r"/user$"), timeout=15000)
    expect(page.get_by_text("Личный кабинет").first).to_be_visible(timeout=15000)
    expect(page.get_by_role("heading", name="Дашборд")).to_have_count(0)


@pytest.fixture
def login_form(page: Page, open_page):
    open_page("/login")
    return page


class TestLoginPage:
    @pytest.mark.smoke
    def test_login_page_renders(self, login_form):
        expect(login_form.get_by_role("heading", name="Вход в Directum360")).to_be_visible()
        expect(login_form.get_by_placeholder("ivanov@example.com")).to_be_visible()
        expect(login_form.get_by_role("button", name="Получить код")).to_be_visible()

    def test_empty_email_does_not_send_code(self, login_form, mailpit):
        """Поле email с required — браузер не выпускает пустую форму, письмо не уходит."""
        marker = now_utc()
        login_form.get_by_role("button", name="Получить код").click()
        login_form.wait_for_timeout(1500)
        expect(login_form.get_by_placeholder("123456")).not_to_be_visible()
        fresh = [m for m in mailpit.messages(ADMIN_EMAIL, "Код для входа")
                 if (m.get("Created") or "")[:19] >= marker.strftime("%Y-%m-%dT%H:%M:%S")]
        assert not fresh, f"пустая форма всё же отправила код: {fresh[:1]}"

    @pytest.mark.smoke
    def test_code_step_appears_after_sending_code(self, login_form, mailpit, toast):
        marker = now_utc()
        login_form.get_by_placeholder("ivanov@example.com").fill(RESPONDENT_EMAIL)
        login_form.get_by_role("button", name="Получить код").click()
        toast("Код отправлен на email")
        expect(login_form.get_by_placeholder("123456")).to_be_visible()
        expect(login_form.get_by_text(f"Код отправлен на {RESPONDENT_EMAIL}")).to_be_visible()
        # письмо действительно ушло — иначе следующий шаг нечего проверять
        assert mailpit.wait_for_login_code(RESPONDENT_EMAIL, since=marker)

    def test_wrong_code_keeps_user_on_login(self, login_form, toast, web_base_url):
        login_form.get_by_placeholder("ivanov@example.com").fill(RESPONDENT_EMAIL)
        login_form.get_by_role("button", name="Получить код").click()
        expect(login_form.get_by_placeholder("123456")).to_be_visible()
        login_form.get_by_placeholder("123456").fill("000000")
        login_form.get_by_role("button", name="Войти").click()
        # UI показывает текст сервера, а не свою заглушку «Неверный код»
        toast("Неверный или уже использованный код")
        expect(login_form).to_have_url(f"{web_base_url}/login")

    def test_email_can_be_changed_on_code_step(self, login_form):
        login_form.get_by_placeholder("ivanov@example.com").fill(RESPONDENT_EMAIL)
        login_form.get_by_role("button", name="Получить код").click()
        expect(login_form.get_by_placeholder("123456")).to_be_visible()
        login_form.get_by_role("button", name="Изменить email").click()
        expect(login_form.get_by_placeholder("ivanov@example.com")).to_have_value(RESPONDENT_EMAIL)

    @pytest.mark.smoke
    def test_full_login_opens_dashboard(self, login_form, mailpit):
        marker = now_utc()
        login_form.get_by_placeholder("ivanov@example.com").fill(ADMIN_EMAIL)
        login_form.get_by_role("button", name="Получить код").click()
        expect(login_form.get_by_placeholder("123456")).to_be_visible()
        code = mailpit.wait_for_login_code(ADMIN_EMAIL, since=marker)
        login_form.get_by_placeholder("123456").fill(code)
        login_form.get_by_role("button", name="Войти").click()
        expect(login_form.get_by_role("heading", name="Дашборд")).to_be_visible(timeout=15000)
        assert login_form.evaluate("localStorage.getItem('authToken')"), "токен не сохранён"
        assert login_form.evaluate("localStorage.getItem('isAdmin')") == "true"


class TestRouteGuards:
    def test_anonymous_user_is_redirected_to_login(self, page: Page, open_page, web_base_url):
        open_page("/")
        expect(page).to_have_url(f"{web_base_url}/login", timeout=15000)

    def test_respondent_lands_in_personal_office(self, sign_in, page: Page):
        """У респондента isAdmin=false, поэтому дашборд автора ему закрыт (AdminRoute)."""
        sign_in(RESPONDENT_EMAIL)
        expect_personal_office(page)

    def test_respondent_cannot_open_author_dashboard(self, sign_in, page: Page, web_base_url):
        sign_in(RESPONDENT_EMAIL, path="/user")
        page.goto(f"{web_base_url}/survey/new", wait_until="domcontentloaded")
        expect_personal_office(page)

    def test_admin_dashboard_has_author_navigation(self, admin_page: Page):
        for label in ("Дашборд", "Создать опрос", "Импорт сотрудников"):
            expect(admin_page.get_by_role("link", name=label).first).to_be_visible()

    def test_logout_returns_to_login_and_clears_token(self, admin_page: Page, web_base_url):
        admin_page.get_by_title("Выйти").click()
        expect(admin_page).to_have_url(f"{web_base_url}/login", timeout=15000)
        assert admin_page.evaluate("localStorage.getItem('authToken')") in (None, "")
