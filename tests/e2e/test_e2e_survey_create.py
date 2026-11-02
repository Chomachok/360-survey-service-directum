"""E2E: создание опроса из интерфейса и проверки формы.

Дашборд → «Создать опрос» → форма → вопросы. Здесь важна и клиентская валидация,
и то, как UI показывает ошибки сервера.
"""
from __future__ import annotations

import pytest
from playwright.sync_api import Page, expect

pytestmark = [pytest.mark.e2e, pytest.mark.surveys]

TITLE_FIELD = "Например: Оценка эффективности команды"
DESCRIPTION_FIELD = "Опишите цель и задачи опроса..."


@pytest.fixture
def create_form(admin_page: Page, open_page):
    admin_page.get_by_role("link", name="Создать опрос").first.click()
    expect(admin_page.get_by_role("heading", name="Создание нового опроса")).to_be_visible()
    return admin_page


def fill_form(page: Page, title: str, dates: tuple[str, str], description: str = "") -> None:
    page.get_by_placeholder(TITLE_FIELD).fill(title)
    if description:
        page.get_by_placeholder(DESCRIPTION_FIELD).fill(description)
    date_fields = page.locator("input[type='datetime-local']")
    date_fields.nth(0).fill(dates[0])
    date_fields.nth(1).fill(dates[1])


class TestCreateFormValidation:
    @pytest.mark.smoke
    def test_form_renders_all_fields(self, create_form):
        """Подписи полей не связаны с инпутами (у label нет htmlFor) — ищем по тексту."""
        for label in ("Название опроса *", "Описание", "Дата начала *", "Дата окончания *",
                      "Шаблон опроса (опционально)"):
            expect(create_form.get_by_text(label, exact=True)).to_be_visible()
        expect(create_form.get_by_placeholder(TITLE_FIELD)).to_be_visible()
        expect(create_form.locator("input[type='datetime-local']")).to_have_count(2)
        expect(create_form.get_by_role("button", name="Создать опрос")).to_be_visible()

    def test_empty_form_shows_three_errors(self, create_form):
        create_form.get_by_role("button", name="Создать опрос").click()
        for message in ("Введите название опроса", "Выберите дату начала", "Выберите дату окончания"):
            expect(create_form.get_by_text(message)).to_be_visible()

    def test_end_not_after_start_is_blocked(self, create_form, future_dates):
        start, _ = future_dates
        fill_form(create_form, "Опрос с перепутанными датами", (start, start))
        create_form.get_by_role("button", name="Создать опрос").click()
        expect(create_form.get_by_text("Дата окончания должна быть позже даты начала")).to_be_visible()

    def test_title_counter_is_visible(self, create_form):
        """Счётчик символов живёт по правилу UI: 250 (лимит API — 200, см. SURV-2)."""
        expect(create_form.get_by_text("0/250")).to_be_visible()
        create_form.get_by_placeholder(TITLE_FIELD).fill("Абв")
        expect(create_form.get_by_text("3/250")).to_be_visible()


class TestCreateSurvey:
    @pytest.mark.smoke
    def test_survey_is_created_and_opens_question_builder(self, create_form, future_dates,
                                                           toast, survey_id_from_url,
                                                           created_survey_ids):
        title = "E2E опрос «360» после создания"
        fill_form(create_form, title, future_dates, description="Проверка сквозного сценария")
        create_form.get_by_role("button", name="Создать опрос").click()
        toast("Опрос успешно создан! Теперь добавьте вопросы.")

        expect(create_form.get_by_role("heading", name="Вопросы опроса").first).to_be_visible()
        survey_id = survey_id_from_url(create_form)
        created_survey_ids.append(survey_id)

        # черновик: статус на странице вопросов и пустой список
        expect(create_form.get_by_text("Добавить вопрос").first).to_be_visible()
        expect(create_form.get_by_text("0 вопросов")).to_be_visible()

    def test_new_survey_appears_on_dashboard_as_draft(self, create_form, future_dates, toast,
                                                       survey_id_from_url, created_survey_ids):
        title = "E2E черновик на дашборде"
        fill_form(create_form, title, future_dates)
        create_form.get_by_role("button", name="Создать опрос").click()
        toast("Опрос успешно создан! Теперь добавьте вопросы.")
        created_survey_ids.append(survey_id_from_url(create_form))

        # Список опросов кэшируется в React Query (staleTime 5с), поэтому ищем новым
        # запросом — через строку поиска, которая меняет ключ кэша.
        create_form.get_by_role("link", name="Дашборд").first.click()
        create_form.get_by_placeholder("Поиск по названию...").fill(title)
        card = create_form.locator("div.card").filter(has_text=title)
        expect(card).to_be_visible(timeout=20000)
        expect(card.get_by_text("Черновик", exact=True)).to_be_visible()
        expect(card.get_by_role("link", name="Вопросы")).to_be_visible()
        expect(card.get_by_role("link", name="Матрица")).to_be_visible()

    @pytest.mark.xfail(reason="ДЕФЕКТ SURV-2: поле названия в UI принимает 250 симворов "
                              "(maxLength=250), а валидатор CreateSurveyDto отклоняет больше 200 — "
                              "пользователь получает ошибку сервера только после отправки формы",
                       strict=False)
    def test_long_title_is_accepted_by_form(self, create_form, future_dates, toast):
        fill_form(create_form, "Д" * 240, future_dates)
        create_form.get_by_role("button", name="Создать опрос").click()
        toast("Опрос успешно создан! Теперь добавьте вопросы.")
