"""E2E: шаблоны и импорт сотрудников через интерфейс.

Шаблоны — основной способ не рисовать матрицу и вопросы вручную, импорт — единственный
массовый способ завести сотрудников. Обоим в API-тестах видно только половину правды.
"""
from __future__ import annotations

import pytest
from conftest import pick_employee
from helpers import SEED_EMPLOYEES, WEB_BASE_URL, unique_suffix
from playwright.sync_api import Page, expect

pytestmark = [pytest.mark.e2e, pytest.mark.templates]

IVANOV = SEED_EMPLOYEES["ivanov"]
PETROV = SEED_EMPLOYEES["petrov"]
IVANOVA = SEED_EMPLOYEES["ivanova"]


@pytest.fixture
def created_template_ids(admin_api):
    """Шаблоны, созданные из UI: их нужно удалять руками, фикстура `surveys` о них не знает."""
    ids: list[int] = []
    yield ids
    for template_id in ids:
        admin_api.delete(f"/api/SurveyTemplates/{template_id}")


@pytest.fixture
def created_employee_ids(admin_api):
    """Сотрудники, созданные из UI (удаляются через админ-панель, DELETE для них нет)."""
    ids: list[int] = []
    yield ids
    for employee_id in ids:
        admin_api.delete(f"/admin-panel/employees/delete/{employee_id}")


def _create_draft(page: Page, title: str, dates: tuple[str, str]) -> int:
    page.goto(f"{WEB_BASE_URL}/survey/new")
    page.get_by_placeholder("Например: Оценка эффективности команды").fill(title)
    date_fields = page.locator("input[type='datetime-local']")
    date_fields.nth(0).fill(dates[0])
    date_fields.nth(1).fill(dates[1])
    page.get_by_role("button", name="Создать опрос").click()
    page.wait_for_url("**/survey/*/questions", wait_until="commit")
    return int(page.url.split("/survey/")[1].split("/")[0])


def _add_choice_question(page: Page, text: str, options: list[str]) -> None:
    """Заполняет форму вопроса: текст, тип «Выбор одного варианта», варианты.

    Список вариантов в форме стартует пустым — каждый вариант добавляется кнопкой.
    """
    page.get_by_placeholder("Введите текст вопроса").fill(text)
    # в форме два select: первый — шаблон вопроса, второй — тип
    page.locator("select").nth(1).select_option("SingleChoice")
    for _ in options:
        page.get_by_role("button", name="Добавить вариант").click()
    for index, option in enumerate(options):
        page.get_by_placeholder(f"Вариант {index + 1}").fill(option)
    page.get_by_role("button", name="Добавить вопрос").click()
    expect(page.get_by_text("Вопрос добавлен", exact=False).first).to_be_visible(timeout=15000)


class TestSurveyTemplateFromUi:
    """Опрос сохраняется как шаблон и разворачивается из него."""

    def test_save_survey_as_template_then_create_from_it(self, admin_page: Page, admin_api,
                                                         future_dates, created_survey_ids,
                                                         created_template_ids, toast,
                                                         unique_title):
        title = unique_title("E2E шаблон из опроса")
        template_name = unique_title("E2E сохранённый шаблон")
        page = admin_page

        survey_id = _create_draft(page, title, future_dates)
        created_survey_ids.append(survey_id)
        question_text = "Насколько своевременно коллега отвечает на письма?"
        _add_choice_question(page, question_text, ["Всегда", "Иногда"])

        # сохраняем опрос как шаблон
        page.get_by_role("button", name="Сохранить опрос как шаблон").click()
        modal = page.locator("div[class*='inset-0'].z-50")
        modal.get_by_placeholder("Введите название").fill(template_name)
        modal.get_by_role("button", name="Сохранить", exact=True).click()
        toast("Шаблон успешно создан!")

        template = next((t for t in admin_api.get("/api/SurveyTemplates").json()
                         if t["name"] == template_name), None)
        assert template, f"шаблон «{template_name}» не появился в API"
        created_template_ids.append(template["id"])

        # новый опрос создразу из шаблона: вопрос подставляется без ручного ввода
        page.goto(f"{WEB_BASE_URL}/survey/new")
        page.get_by_placeholder("Например: Оценка эффективности команды").fill(
            unique_title("E2E опрос из шаблона"))
        pick_employee(page, template_name, 0)
        date_fields = page.locator("input[type='datetime-local']")
        date_fields.nth(0).fill(future_dates[0])
        date_fields.nth(1).fill(future_dates[1])
        page.get_by_role("button", name="Создать опрос").click()
        page.wait_for_url("**/survey/*/questions", wait_until="commit")
        new_id = int(page.url.split("/survey/")[1].split("/")[0])
        created_survey_ids.append(new_id)

        expect(page.get_by_text(question_text).first).to_be_visible(timeout=15000)
        assert admin_api.get(f"/api/questions/surveys/{new_id}").json()[0]["text"] == question_text


class TestRespondentTemplateOnMatrix:
    """Шаблон респондентов применяется к черновику из страницы матрицы."""

    def test_apply_template_creates_links(self, admin_page: Page, admin_api, surveys,
                                          future_dates, created_survey_ids, toast,
                                          unique_title):
        template = surveys.respondent_template(
            name=unique_title("E2E шаблон респондентов"),
            items=[{"employeeId": PETROV["id"]}, {"employeeId": IVANOVA["id"]}],
            targetEmployeeIds=[IVANOV["id"]],
        )
        page = admin_page
        title = unique_title("E2E матрица из шаблона")
        survey_id = _create_draft(page, title, future_dates)
        created_survey_ids.append(survey_id)

        page.goto(f"{WEB_BASE_URL}/survey/{survey_id}/matrix")
        pick_employee(page, template["name"], 0)
        page.get_by_role("button", name="Применить", exact=True).click()
        toast("Шаблон матрицы успешно применён")

        # две связи: Петров→Иванов и Иванова→Иванов
        expect(page.get_by_role("button", name="Копировать ссылку")).to_have_count(2, timeout=15000)
        assert len(admin_api.get(f"/api/surveys/{survey_id}/matrix").json()) == 2


class TestManualEmployeeCreate:
    """Форма «Добавить вручную» на странице импорта."""

    def test_create_employee_from_form(self, admin_page: Page, admin_api, toast,
                                        created_employee_ids):
        email = f"e2e-manual-{unique_suffix()}@example.com"
        page = admin_page
        page.goto(f"{WEB_BASE_URL}/import")

        page.get_by_placeholder("Иванов Иван Иванович").fill("Е2Е Сотрудник Тестович")
        page.get_by_placeholder("ivanov@example.com").fill(email)
        page.get_by_role("button", name="Создать сотрудника").click()
        toast("Сотрудник успешно создан!")

        found = [e for e in admin_api.get("/api/employees").json() if e["email"] == email]
        assert len(found) == 1, f"сотрудник не найден в списке: {found}"
        created_employee_ids.append(found[0]["id"])

    def test_empty_form_shows_field_errors(self, admin_page: Page):
        """Клиентская валидация не отпускает запрос на сервер."""
        page = admin_page
        page.goto(f"{WEB_BASE_URL}/import")
        page.get_by_role("button", name="Создать сотрудника").click()
        expect(page.get_by_text("Введите ФИО").first).to_be_visible()
        expect(page.get_by_text("Введите Email").first).to_be_visible()


class TestCsvImport:
    """Импорт сотрудников из CSV-файла."""

    @pytest.fixture
    def csv_data(self):
        """CSV с одним сотрудником: email уникален на прогон, иначе повторный импорт
        нашёл бы запись предыдущего запуска."""
        email = f"e2e-import-{unique_suffix()}@example.com"
        content = f"FullName,Email,Roles\nИмпортируемый Из CSV,{email},Respondent\n"
        return email, content

    @pytest.fixture
    def csv_file(self, tmp_path, csv_data):
        path = tmp_path / "employees.csv"
        path.write_text(csv_data[1], encoding="utf-8")
        return str(path)

    def test_csv_import_creates_employee(self, admin_page: Page, admin_api, csv_file,
                                         csv_data, created_employee_ids, toast):
        email = csv_data[0]
        page = admin_page
        page.goto(f"{WEB_BASE_URL}/import")
        expect(page.get_by_role("button", name="Импортировать")).to_be_disabled()

        page.locator("input[type='file']").set_input_files(csv_file)
        expect(page.get_by_role("button", name="Импортировать")).to_be_enabled()
        page.get_by_role("button", name="Импортировать").click()
        toast("Сотрудники успешно импортированы!")

        found = [e for e in admin_api.get("/api/employees").json() if e["email"] == email]
        assert len(found) == 1, f"импортированный сотрудник не появился: {found}"
        created_employee_ids.append(found[0]["id"])

    @pytest.mark.xfail(reason="ДЕФЕКТ EMP-3: EmployeeService.ImportEmployeesFromCsvAsync читает "
                              "CSV через CsvReader.GetRecords<EmployeeImportDto>, колонка Roles "
                              "не маппится — у всех импортированных сотрудников roles пустые, "
                              "и они не получают права",
                       strict=False)
    def test_csv_import_keeps_roles(self, admin_page: Page, admin_api, csv_file,
                                    csv_data, created_employee_ids, toast):
        email = csv_data[0]
        page = admin_page
        page.goto(f"{WEB_BASE_URL}/import")
        page.locator("input[type='file']").set_input_files(csv_file)
        page.get_by_role("button", name="Импортировать").click()
        toast("Сотрудники успешно импортированы!")

        found = [e for e in admin_api.get("/api/employees").json() if e["email"] == email]
        assert found and found[0]["roles"], "у импортированного сотрудника пустой список ролей"
