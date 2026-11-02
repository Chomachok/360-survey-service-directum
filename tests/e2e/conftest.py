"""Фикстуры браузерных тестов: адрес фронтенда, «быстрый» вход и очистка данных.

Логин через UI медленный (нужно письмо с кодом), поэтому почти все сценарии входят
«в обход»: получают JWT тем же путём, что и API-тесты, и кладут его в localStorage —
дальше приложение ведёт себя как после настоящего входа.
"""
from __future__ import annotations

import base64
import json
import re
from datetime import date, timedelta
from typing import Any, Callable

import pytest

from helpers import ADMIN_EMAIL, ApiClient, SEED_EMPLOYEES, WEB_BASE_URL, unique_suffix
from playwright.sync_api import Locator, Page, expect

pytestmark = [pytest.mark.e2e]

IVANOV = SEED_EMPLOYEES["ivanov"]
PETROV = SEED_EMPLOYEES["petrov"]


def jwt_claims(token: str) -> dict[str, Any]:
    """Разбирает JWT без проверки подписи: нужны unique_name и IsAdmin для localStorage."""
    segment = token.split(".")[1]
    segment += "=" * (-len(segment) % 4)
    return json.loads(base64.urlsafe_b64decode(segment))


@pytest.fixture(scope="session")
def web_base_url() -> str:
    return WEB_BASE_URL.rstrip("/")


@pytest.fixture
def open_page(page: Page, web_base_url: str) -> Callable[[str], Page]:
    """Открывает страницу приложения по внутреннему маршруту ("/survey/new")."""

    def _open(path: str) -> Page:
        page.goto(f"{web_base_url}{path}", wait_until="domcontentloaded")
        return page

    return _open


@pytest.fixture
def sign_in(page: Page, open_page: Callable[[str], Page],
            login: Callable[[str], str]) -> Callable[..., Page]:
    """Вход без формы: authToken/userName/userEmail/isAdmin в localStorage и переход на маршрут."""

    def _sign_in(email: str, path: str = "/") -> Page:
        token = login(email)
        claims = jwt_claims(token)
        # Любой адрес того же origin — иначе localStorage недоступен до загрузки приложения.
        open_page("/login")
        page.evaluate(
            """([token, name, email, isAdmin]) => {
                localStorage.setItem('authToken', token);
                localStorage.setItem('userName', name);
                localStorage.setItem('userEmail', email);
                localStorage.setItem('isAdmin', isAdmin);
            }""",
            [token, claims.get("unique_name", email), email,
             "true" if claims.get("IsAdmin") == "True" else "false"],
        )
        open_page(path)
        return page

    return _sign_in


@pytest.fixture
def admin_page(browser):
    context = browser.new_context()
    page = context.new_page()
    page.set_default_timeout(15000)
    yield page
    context.close()


@pytest.fixture
def toast(page: Page) -> Callable[[str], None]:
    """Ждёт всплывающее сообщение react-hot-toast (они исчезают через ~4 секунды)."""

    def _wait(text: str) -> None:
        expect(page.get_by_text(text, exact=False).first).to_be_visible(timeout=15000)

    return _wait


@pytest.fixture
def created_survey_ids(admin_api: ApiClient):
    """Собирает id опросов, созданных из UI, и удаляет их после теста."""
    ids: list[int] = []
    yield ids
    for survey_id in ids:
        response = admin_api.delete(f"/api/surveys/{survey_id}")
        if response.status_code != 204:
            print(f"[e2e-cleanup] опрос {survey_id} не удалён: "
                  f"{response.status_code} {response.text[:120]}")


@pytest.fixture
def survey_id_from_url() -> Callable[[Page], int]:
    """Достаёт id опроса из адреса вида /survey/12/questions."""

    def _id(page: Page) -> int:
        match = re.search(r"/survey/(\d+)", page.url)
        assert match, f"в адресе нет id опроса: {page.url}"
        return int(match.group(1))

    return _id


@pytest.fixture
def future_dates() -> tuple[str, str]:
    """Значения для input[type=datetime-local]: старт завтра, финиш через месяц.

    Стартовать «в будущем» обязательно: иначе опрос становится активным сразу после
    первого открытия (дефект SURV-7), и матрица с вопросами блокируются.
    """
    start = date.today() + timedelta(days=1)
    end = start + timedelta(days=30)
    return start.strftime("%Y-%m-%dT09:00"), end.strftime("%Y-%m-%dT18:00")


@pytest.fixture
def unique_title() -> Callable[[str], str]:
    """Уникальный заголовок опроса.

    В dev-базе копятся тестовые опросы: черновики с ответами удалить нельзя
    (дефект SURV-10), поэтому поиск на дашборде может найти несколько карточек
    с одинаковым названием — и действие уйдёт не в тот опрос.
    """
    counter: list[int] = []

    def _title(prefix: str) -> str:
        counter.append(1)
        return f"{prefix} {unique_suffix()}"

    return _title


# --- react-select ---------------------------------------------------------
# На странице матрицы контролы идут в порядке DOM: 0 — «Шаблон матрицы»,
# 1 — «Кого оценивают», 2 — «Кто оценивает». Меню рендерится порталом в body,
# пункты имеют role="option".
def select_control(page: Page, index: int) -> Locator:
    return page.locator('div[class*="-control"]').nth(index)


def pick_employee(page: Page, name: str, index: int) -> None:
    select_control(page, index).click()
    page.get_by_role("option", name=name, exact=True).click()


def matrix_list_mode(page: Page) -> None:
    """Включает режим «Список» — только в нём есть форма добавления связей.

    Режим по умолчанию — «Матрица», форма сотрудников в нём не отрисована.
    """
    switch_to_list_view(page)
    expect(page.get_by_text("Кого оценивают")).to_be_visible()


def switch_to_list_view(page: Page) -> None:
    """Переключает тумблер «Матрица → Список».

    В режиме списка пустая матрица показывается надписью «Матрица пуста», а не
    таблицей, поэтому ждём либо заголовок таблицы, либо это сообщение.
    """
    switch = page.locator('button[role="switch"]').first
    if switch.get_attribute("aria-checked") == "true":
        switch.click()
    empty_or_table = (page.locator("th").filter(has_text="Оцениваемый")
                      .or_(page.get_by_text("Матрица пуста")))
    expect(empty_or_table.first).to_be_visible(timeout=15000)
