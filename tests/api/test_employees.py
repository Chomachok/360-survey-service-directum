"""API-тесты справочника сотрудников: /api/employees и админ-панель /admin-panel/employees."""
from __future__ import annotations

import io

import pytest

from helpers import (
    SEED_EMPLOYEES,
    ApiClient,
    message_text,
    unique_suffix,
)

pytestmark = [pytest.mark.api, pytest.mark.employees, pytest.mark.regression]

SYSADMIN_EMAIL = SEED_EMPLOYEES["sysadmin"]["email"]
ADMIN_EMAIL = SEED_EMPLOYEES["admin"]["email"]


def employees_of(client) -> list[dict]:
    response = client.get("/api/employees")
    assert response.status_code == 200
    return response.json()


def csv_upload(client, content: str, filename: str = "employees.csv",
               path: str = "/api/employees/import"):
    files = {"file": (filename, io.BytesIO(content.encode("utf-8")), "text/csv")}
    headers = {"Content-Type": None}  # requests сам поставит multipart boundary
    return client.post(path, files=files, headers=headers)


class TestEmployeeDirectory:
    @pytest.mark.smoke
    def test_seed_employees_are_listed(self, admin_api):
        listed = employees_of(admin_api)
        assert {e["email"] for e in listed} >= {SEED_EMPLOYEES[key]["email"]
                                               for key in ("ivanov", "petrov", "sysadmin")}
        assert all({"id", "fullName", "email", "roles"} <= set(e) for e in listed)

    def test_list_is_sorted_by_full_name(self, admin_api):
        names = [e["fullName"] for e in employees_of(admin_api)]
        assert names == sorted(names)

    def test_roles_are_serialized_as_strings(self, admin_api):
        sysadmin = next(e for e in employees_of(admin_api)
                        if e["email"] == SYSADMIN_EMAIL)
        assert "SystemAdministrator" in sysadmin["roles"]

    def test_created_employee_appears_in_directory(self, surveys):
        employee = surveys.employee(fullName="Тест Тест Тестович")
        assert employee["email"] in [e["email"] for e in employees_of(surveys.client)]
        assert employee["roles"] == ["Respondent"]

    @pytest.mark.parametrize("payload", [
        {"fullName": "", "email": f"x{unique_suffix()}@example.com"},
        {"fullName": "Без почты", "email": ""},
        {"fullName": "Неверная почта", "email": "not-an-email"},
    ], ids=["empty-name", "empty-email", "invalid-email"])
    def test_invalid_employee_payload_is_not_validated(self, admin_api, surveys, payload):
        """ДЕФЕКТ EMP-1: на CreateEmployeeDto нет валидатора — мусорные сотрудники создаются."""
        body = {"roles": ["Respondent"], **payload}
        response = admin_api.post("/api/employees", json=body)
        if response.status_code == 201:
            surveys.created_employees.append(response.json()["id"])
        assert response.status_code == 201, f"ожидали 400, получили {response.status_code}"

    def test_unknown_role_is_rejected(self, admin_api):
        """Единственная работающая проверка: enum-биндинг отклоняет неизвестную роль."""
        response = admin_api.post("/api/employees", json={
            "fullName": "Чужая роль", "email": f"x{unique_suffix()}@example.com",
            "roles": ["SuperUser"]})
        assert response.status_code == 400

    def test_duplicate_email_is_allowed(self, admin_api, surveys):
        """ДЕФЕКТ EMP-2: два сотрудника с одним email — вход по email вернёт первого,
        приглашения уйдут обоим."""
        email = f"dup.{unique_suffix()}@example.com"
        first = admin_api.post("/api/employees",
                               json={"fullName": "Первый Двойник", "email": email,
                                     "roles": ["Respondent"]})
        second = admin_api.post("/api/employees",
                                json={"fullName": "Второй Двойник", "email": email,
                                      "roles": ["Respondent"]})
        for response in (first, second):
            if response.status_code == 201:
                surveys.created_employees.append(response.json()["id"])
        assert first.status_code == 201 and second.status_code == 201
        assert len([e for e in employees_of(admin_api) if e["email"] == email]) == 2

    @pytest.mark.xfail(reason="ДЕФЕКТ EMP-2: создание сотрудника с занятым email должно отклоняться 409",
                       strict=False)
    def test_duplicate_email_should_be_rejected(self, admin_api):
        email = f"dup.{unique_suffix()}@example.com"
        admin_api.post("/api/employees", json={"fullName": "Первый", "email": email,
                                               "roles": ["Respondent"]})
        response = admin_api.post("/api/employees", json={"fullName": "Второй", "email": email,
                                                          "roles": ["Respondent"]})
        assert response.status_code in (400, 409)

    def test_no_delete_endpoint_for_employees(self, admin_api):
        assert admin_api.delete("/api/employees/1").status_code == 404


class TestCsvImport:
    """Два эндпоинта импорта ведут себя по-разному: UI (`frontend/src/api/employees.ts`)
    вызывает /api/employees/import, а /admin-panel/employees/import вообще нерабочий."""

    def test_import_creates_employees(self, admin_api, surveys):
        email = f"imp.{unique_suffix()}@example.com"
        response = csv_upload(admin_api, f"FullName,Email,Roles\nИмпорт Импорт импортович,{email},Respondent\n")
        assert response.status_code == 200, message_text(response)
        imported = [e for e in employees_of(admin_api) if e["email"] == email]
        surveys.created_employees.extend(e["id"] for e in imported)
        assert len(imported) == 1

    def test_import_ignores_roles_column(self, admin_api, surveys):
        """ДЕФЕКТ EMP-3: EmployeeService читает CSV через GetRecords<EmployeeImportDto>,
        List<EmployeeRole> не конвертируется — колонка Roles теряется, все импортированные
        сотрудники остаются без ролей (автора/администратора импортировать нельзя)."""
        email = f"roles.{unique_suffix()}@example.com"
        assert csv_upload(admin_api,
                          f"FullName,Email,Roles\nРоль Потеряна,{email},SurveyAuthor\n"
                          ).status_code == 200
        imported = [e for e in employees_of(admin_api) if e["email"] == email]
        surveys.created_employees.extend(e["id"] for e in imported)
        assert len(imported) >= 1, "сотрудник должен появиться в списке"
        assert imported[0]["roles"] == []

    @pytest.mark.xfail(reason="ДЕФЕКТ EMP-3: роли из колонки Roles должны сохраняться", strict=False)
    def test_import_should_preserve_roles(self, admin_api, surveys):
        email = f"roles-ok.{unique_suffix()}@example.com"
        csv_upload(admin_api, f"FullName,Email,Roles\nРоль Сохранена,{email},SurveyAuthor\n")
        imported = [e for e in employees_of(admin_api) if e["email"] == email]
        surveys.created_employees.extend(e["id"] for e in imported)
        assert imported[0]["roles"] == ["SurveyAuthor"]

    def test_import_does_not_validate_rows(self, admin_api, surveys):
        """ДЕФЕКТ EMP-3 (часть 2): валидации строк нет — пустой FullName, пустой email,
        неизвестная роль и дубликат email импортируются с 200."""
        email = f"junk.{unique_suffix()}@example.com"
        before = {e["id"] for e in employees_of(admin_api)}
        csv = (f"FullName,Email,Roles\n"
               f",,SuperUser\n"
               f"Дубликат Первый,{email},Respondent\n"
               f"Дубликат Второй,{email},Respondent\n")
        response = csv_upload(admin_api, csv)
        assert response.status_code == 200, message_text(response)
        created = [e for e in employees_of(admin_api) if e["id"] not in before]
        surveys.created_employees.extend(e["id"] for e in created)
        assert len(created) == 3, f"импорт должен был отклонить битые строки, а создал: {created}"

    def test_import_rejects_empty_file(self, admin_api):
        response = csv_upload(admin_api, "")
        assert response.status_code == 400
        assert "Файл не выбран или пуст" in message_text(response)

    def test_import_requires_header(self, admin_api):
        """Без строки заголовков CsvHelper падает — ответ хотя бы объясняет причину."""
        response = csv_upload(admin_api, f"Без Заголовков,headerless.{unique_suffix()}@e.com,Respondent\n")
        assert response.status_code == 400
        assert "Header with name" in message_text(response)

    def test_admin_panel_import_is_broken(self, admin_api):
        """ДЕФЕКТ EMP-5: /admin-panel/employees/import вызывает csv.Read() без ReadHeader(),
        поэтому CsvHelper отдаёт «The header has not been read» на ЛЮБОЙ файл — эндпоинт
        нерабочий, вся аккуратная валидация AdminPanelService недостижима."""
        email = f"panel.{unique_suffix()}@example.com"
        response = csv_upload(admin_api, f"FullName,Email,Roles\nПанель Импорт Тестович,{email},Respondent\n",
                              path="/admin-panel/employees/import")
        assert response.status_code == 400
        assert "Cannot parse CSV" in message_text(response)
        assert not [e for e in employees_of(admin_api) if e["email"] == email]

    @pytest.mark.xfail(reason="ДЕФЕКТ EMP-5: корректный CSV должен импортироваться через админ-панель",
                       strict=False)
    def test_admin_panel_import_should_accept_simple_csv(self, admin_api, surveys):
        email = f"panel-ok.{unique_suffix()}@example.com"
        response = csv_upload(admin_api, f"FullName,Email,Roles\nПанель Ок Тестович,{email},Respondent\n",
                              path="/admin-panel/employees/import")
        assert response.status_code == 200, message_text(response)
        imported = [e for e in employees_of(admin_api) if e["email"] == email]
        surveys.created_employees.extend(e["id"] for e in imported)
        assert imported[0]["roles"] == ["Respondent"]

    @pytest.mark.xfail(reason="ДЕФЕКТ EMP-5: после починки ReadHeader админ-панель должна "
                              "отклонять битые строки с понятным текстом", strict=False)
    def test_admin_panel_import_should_report_bad_rows(self, admin_api):
        response = csv_upload(admin_api, "FullName,Email,Roles\nБез почты,,Respondent\n",
                              path="/admin-panel/employees/import")
        assert response.status_code == 400
        assert "invalid email" in message_text(response)


class TestAdminPanelCrud:
    @pytest.mark.smoke
    def test_create_then_get_by_id(self, admin_api, surveys):
        employee = surveys.employee(fullName="Админка Тестовый")
        fetched = admin_api.get(f"/admin-panel/employees/{employee['id']}")
        assert fetched.status_code == 200
        assert fetched.json()["fullName"] == "Админка Тестовый"

    def test_created_employee_can_log_in(self, admin_api, surveys, login):
        """Проверяем сквозной сценарий: сотрудник из админки становится пользователем системы."""
        employee = surveys.employee(fullName="Логин Тестовый",
                                    email=f"login.{unique_suffix()}@example.com")
        token = login(employee["email"])
        client = ApiClient(admin_api.base_url, token=token)
        assert client.get("/api/user/surveys").status_code == 200
        client.close()

    def test_patch_updates_fields(self, admin_api, surveys):
        employee = surveys.employee(fullName="До изменения")
        response = admin_api.patch(f"/admin-panel/employees/update/{employee['id']}",
                                   json={"fullName": "После изменения",
                                         "roles": ["Respondent", "SurveyAuthor"]})
        assert response.status_code == 200
        assert response.json()["fullName"] == "После изменения"
        assert set(response.json()["roles"]) == {"Respondent", "SurveyAuthor"}

    def test_patch_is_partial(self, admin_api, surveys):
        employee = surveys.employee(fullName="Частично")
        response = admin_api.patch(f"/admin-panel/employees/update/{employee['id']}",
                                   json={"fullName": "Только имя"})
        assert response.status_code == 200
        assert response.json()["email"] == employee["email"]

    def test_patch_rejects_taken_email(self, admin_api, surveys):
        first = surveys.employee()
        second = surveys.employee()
        response = admin_api.patch(f"/admin-panel/employees/update/{second['id']}",
                                   json={"email": first["email"]})
        assert response.status_code == 409
        assert "already exists" in message_text(response)

    def test_patch_unknown_employee_returns_404(self, admin_api):
        response = admin_api.patch("/admin-panel/employees/update/999999", json={"fullName": "x"})
        assert response.status_code == 404

    def test_delete_removes_employee(self, admin_api, surveys):
        employee = surveys.employee()
        assert admin_api.delete(f"/admin-panel/employees/delete/{employee['id']}").status_code == 204
        assert admin_api.get(f"/admin-panel/employees/{employee['id']}").status_code == 404
        surveys.created_employees.remove(employee["id"])

    def test_delete_unknown_employee_returns_404(self, admin_api):
        assert admin_api.delete("/admin-panel/employees/delete/999999").status_code == 404

    def test_employee_used_in_survey_cannot_be_deleted(self, surveys, admin_api):
        """ДЕФЕКТ EMP-4: FK Author/Restrict → удаление сотрудника с опросами даёт 409
        с сырым текстом ошибки EF Core."""
        employee = surveys.employee(fullName="Автор с опросом")
        surveys.draft(authorId=employee["id"])
        response = admin_api.delete(f"/admin-panel/employees/delete/{employee['id']}")
        assert response.status_code == 409
        assert "inner exception" in message_text(response).lower()

    def test_admin_panel_employee_list_matches_directory(self, admin_api):
        panel = admin_api.get("/admin-panel/employees").json()
        directory = employees_of(admin_api)
        assert {e["id"] for e in panel} == {e["id"] for e in directory}
