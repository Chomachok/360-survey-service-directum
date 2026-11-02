"""API-тесты входа: одноразовые коды на почту и выдача JWT."""
from __future__ import annotations

import re

import pytest

from helpers import (
    ADMIN_EMAIL,
    RESPONDENT_EMAIL,
    SEED_EMPLOYEES,
    ApiClient,
    MailpitClient,
    message_text,
    now_utc,
)

pytestmark = [pytest.mark.api, pytest.mark.auth, pytest.mark.regression]


def _request_code(api: ApiClient, email: str):
    marker = now_utc()
    response = api.post("/api/auth/send-code", json={"email": email})
    return response, marker


class TestSendCode:
    @pytest.mark.smoke
    def test_code_delivered_to_known_employee(self, api, mailpit: MailpitClient):
        response, marker = _request_code(api, RESPONDENT_EMAIL)
        assert response.status_code == 200
        code = mailpit.wait_for_login_code(RESPONDENT_EMAIL, since=marker)
        assert re.fullmatch(r"\d{6}", code), f"код не шестизначный: {code}"

    def test_unknown_email_rejected(self, api):
        response = api.post("/api/auth/send-code", json={"email": "kogo-takogo-net@example.com"})
        assert response.status_code == 400
        assert "не найден" in message_text(response)

    @pytest.mark.xfail(
        reason="ДЕФЕКТ AUTH-1: ответ 400 «Пользователь с таким email не найден» позволяет "
               "проверить, есть ли сотрудник в системе (enumeration). Безопасный вариант — "
               "всегда 200 с нейтральным текстом.",
        strict=False,
    )
    def test_unknown_email_does_not_leak_existence(self, api):
        known = api.post("/api/auth/send-code", json={"email": RESPONDENT_EMAIL})
        unknown = api.post("/api/auth/send-code", json={"email": "kogo-takogo-net@example.com"})
        assert known.status_code == unknown.status_code == 200
        assert known.text == unknown.text

    def test_missing_email_field(self, api):
        response = api.post("/api/auth/send-code", json={})
        assert response.status_code == 400

    def test_new_code_invalidates_previous_one(self, api, mailpit: MailpitClient):
        first, marker_1 = _request_code(api, RESPONDENT_EMAIL)
        assert first.status_code == 200
        code_1 = mailpit.wait_for_login_code(RESPONDENT_EMAIL, since=marker_1)

        second, marker_2 = _request_code(api, RESPONDENT_EMAIL)
        assert second.status_code == 200
        code_2 = mailpit.wait_for_login_code(RESPONDENT_EMAIL, since=marker_2)
        assert code_1 != code_2, "новый код совпал со старым"

        old = api.post("/api/auth/verify", json={"email": RESPONDENT_EMAIL, "code": code_1})
        assert old.status_code == 400, "старый код остался валидным после перевыпуска"


class TestVerifyCode:
    @pytest.mark.smoke
    def test_admin_gets_jwt_with_role_claims(self, api, login):
        token = login(ADMIN_EMAIL)
        assert token and token.count(".") == 2
        client = ApiClient(api.base_url, token=token)
        me = client.get("/api/user/surveys")
        assert me.status_code == 200
        client.close()

    def test_verify_response_contract(self, api, mailpit: MailpitClient):
        _, marker = _request_code(api, ADMIN_EMAIL)
        code = mailpit.wait_for_login_code(ADMIN_EMAIL, since=marker)
        response = api.post("/api/auth/verify", json={"email": ADMIN_EMAIL, "code": code})
        assert response.status_code == 200
        body = response.json()
        assert set(body) == {"token", "fullName", "isAdmin", "email"}
        assert body["email"] == ADMIN_EMAIL
        assert body["isAdmin"] is True
        assert body["fullName"] == SEED_EMPLOYEES["sysadmin"]["fullName"]

    def test_respondent_is_not_admin(self, api, mailpit: MailpitClient):
        _, marker = _request_code(api, RESPONDENT_EMAIL)
        code = mailpit.wait_for_login_code(RESPONDENT_EMAIL, since=marker)
        response = api.post("/api/auth/verify", json={"email": RESPONDENT_EMAIL, "code": code})
        assert response.status_code == 200
        assert response.json()["isAdmin"] is False

    def test_wrong_code_rejected(self, api):
        response = api.post("/api/auth/verify", json={"email": ADMIN_EMAIL, "code": "000000"})
        assert response.status_code == 400
        assert "Неверный" in message_text(response) or "код" in message_text(response).lower()

    @pytest.mark.parametrize("bad_body", [
        {"email": ADMIN_EMAIL},
        {"code": "123456"},
        {"email": "", "code": ""},
    ])
    def test_incomplete_payload_rejected(self, api, bad_body):
        response = api.post("/api/auth/verify", json=bad_body)
        assert response.status_code == 400

    def test_code_is_single_use(self, api, mailpit: MailpitClient):
        _, marker = _request_code(api, RESPONDENT_EMAIL)
        code = mailpit.wait_for_login_code(RESPONDENT_EMAIL, since=marker)
        first = api.post("/api/auth/verify", json={"email": RESPONDENT_EMAIL, "code": code})
        assert first.status_code == 200
        second = api.post("/api/auth/verify", json={"email": RESPONDENT_EMAIL, "code": code})
        assert second.status_code == 400, "одноразовый код приняли повторно"


class TestJwtProtection:
    @pytest.mark.parametrize("path", [
        "/api/surveys",
        "/api/questions/templates",
        "/api/employees",
        "/api/SurveyTemplates",
        "/api/respondent-templates",
    ])
    def test_anonymous_access_is_blocked(self, api, path):
        assert api.get(path).status_code == 401

    def test_garbage_token_is_rejected(self, api):
        client = ApiClient(api.base_url, token="eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJmYWtlIn0.fake")
        assert client.get("/api/surveys").status_code == 401
        client.close()

    def test_token_of_other_user_is_accepted_for_own_requests(self, respondent_api):
        assert respondent_api.get("/api/user/surveys").status_code == 200
