"""Конфигурация, HTTP-клиенты и фабрики данных для автотестов Directum360 Feedback.

Как запустить:
    docker-compose up -d                      # backend :5223, frontend :8080, mailpit :8025
    python -m pip install -r tests/requirements.txt
    python -m playwright install chromium     # только для E2E
    python -m pytest tests                    # всё
    python -m pytest tests/api -m smoke       # только API-смоук

Все адреса можно переопределить переменными окружения: API_BASE_URL, WEB_BASE_URL,
MAILPIT_URL, HTTP_TIMEOUT.
"""
from __future__ import annotations

import os
import re
import time
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Iterable

import requests

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:5223")
WEB_BASE_URL = os.getenv("WEB_BASE_URL", "http://[::1]:8080")
MAILPIT_URL = os.getenv("MAILPIT_URL", "http://localhost:8025")
HTTP_TIMEOUT = float(os.getenv("HTTP_TIMEOUT", "20"))

# Сотрудники, которые есть в БД всегда (seed в AppDbContext.OnModelCreating).
SEED_EMPLOYEES = {
    "ivanov": {"id": 1, "email": "ivanov@example.com", "fullName": "Иванов Иван Иванович"},
    "petrov": {"id": 2, "email": "petrov@example.com", "fullName": "Петров Пётр Петрович"},
    "ivanova": {"id": 3, "email": "ivanova@example.com", "fullName": "Иванова Мария Ивановна"},
    "aleksandrovna": {"id": 4, "email": "alexsandrovna@example.com", "fullName": "Александрова Александра Александровна"},
    "admin": {"id": 5, "email": "admin@directum360.ru", "fullName": "Администратор"},
    "sysadmin": {"id": 6, "email": "sysadmin@directum360.ru", "fullName": "Системный администратор"},
}
ADMIN_EMAIL = SEED_EMPLOYEES["sysadmin"]["email"]
RESPONDENT_EMAIL = SEED_EMPLOYEES["petrov"]["email"]
# «Обычный» администратор (Administrator без SystemAdministrator) — источник дефекта RBAC-1
ADMINISTRATOR_EMAIL = SEED_EMPLOYEES["admin"]["email"]

STATUS_DRAFT = "Draft"
STATUS_ACTIVE = "Active"
STATUS_COMPLETED = "Completed"


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def iso_utc(moment: datetime) -> str:
    """ISO-8601 с явным Z — бэкенд парсит дату как UTC."""
    return moment.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def unique_suffix() -> str:
    return uuid.uuid4().hex[:8]


def draft_window() -> tuple[str, str]:
    """Окно «в будущем»: опрос гарантированно остаётся черновиком.

    Это обязательно: бэкенд при любом GET переводит черновик в «Активен»,
    если StartDate <= сейчас (SurveyService.CheckAndUpdateAsync).
    """
    start = now_utc() + timedelta(days=1)
    return iso_utc(start), iso_utc(start + timedelta(days=30))


def survey_payload(title: str | None = None, **overrides: Any) -> dict:
    start, end = draft_window()
    payload: dict[str, Any] = {
        "title": f"Автотест опрос {unique_suffix()}" if title is None else title,
        "description": "Описание, созданное автотестом",
        "startDate": start,
        "endDate": end,
        "authorId": SEED_EMPLOYEES["sysadmin"]["id"],
    }
    payload.update(overrides)
    return payload


def question_payload(text: str | None = None, **overrides: Any) -> dict:
    payload: dict[str, Any] = {
        "text": f"Вопрос {unique_suffix()}" if text is None else text,
        "type": "Text",
        "required": False,
        "order": 1,
        "options": None,
    }
    payload.update(overrides)
    return payload


def choice_question_payload(text: str | None = None, options: Iterable[str] | None = None,
                            **overrides: Any) -> dict:
    payload = question_payload(
        text,
        type="SingleChoice",
        options=list(options or ["Отлично", "Хорошо", "Плохо"]),
        **overrides,
    )
    return payload


class ApiClient:
    """Тонкая обёртка над requests: пути относительные, ответы как есть.

    Методы НЕ проверяют код ответа — проверки живут в тестах.
    """

    def __init__(self, base_url: str = API_BASE_URL, token: str | None = None):
        self.base_url = base_url.rstrip("/")
        self.session = requests.Session()
        self.session.headers["Content-Type"] = "application/json"
        if token:
            self.session.headers["Authorization"] = f"Bearer {token}"

    @property
    def token(self) -> str | None:
        return self.session.headers.get("Authorization", "").removeprefix("Bearer ") or None

    def url(self, path: str) -> str:
        return f"{self.base_url}/{path.lstrip('/')}"

    def request(self, method: str, path: str, **kwargs: Any) -> requests.Response:
        kwargs.setdefault("timeout", HTTP_TIMEOUT)
        headers = kwargs.pop("headers", None)
        merged = dict(self.session.headers)
        if headers:
            merged.update(headers)
        return self.session.request(method, self.url(path), headers=merged, **kwargs)

    def get(self, path: str, **kwargs: Any) -> requests.Response:
        return self.request("GET", path, **kwargs)

    def post(self, path: str, **kwargs: Any) -> requests.Response:
        return self.request("POST", path, **kwargs)

    def put(self, path: str, **kwargs: Any) -> requests.Response:
        return self.request("PUT", path, **kwargs)

    def patch(self, path: str, **kwargs: Any) -> requests.Response:
        return self.request("PATCH", path, **kwargs)

    def delete(self, path: str, **kwargs: Any) -> requests.Response:
        return self.request("DELETE", path, **kwargs)

    def close(self) -> None:
        self.session.close()


class MailpitClient:
    """Клиент REST API Mailpit (dev-почта): коды входа и приглашения на опрос."""

    def __init__(self, base_url: str = MAILPIT_URL):
        self.base_url = base_url.rstrip("/")

    def _get(self, path: str, **params: Any) -> dict:
        response = requests.get(f"{self.base_url}{path}", params=params or None, timeout=HTTP_TIMEOUT)
        response.raise_for_status()
        return response.json()

    @staticmethod
    def message_time(value: str) -> datetime:
        """Разбирает время письма Mailpit («2026-11-02T10:31:29.348Z»).

        Дробная часть секунды бывает разной длины («.3Z», «.27Z», «.123456789Z»), поэтому
        сортировка и сравнение строк дают неверный порядок: письмо с «.3» оказывается
        новее письма с «.27». Из-за этого «самое свежее» письмо иногда возвращало
        уже использованный код входа.
        """
        match = re.match(
            r"(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d+))?", value or "")
        if not match:
            return datetime.min.replace(tzinfo=timezone.utc)
        seconds, fraction = match.groups()
        moment = datetime.strptime(seconds, "%Y-%m-%dT%H:%M:%S")
        micro = int((fraction or "0")[:6].ljust(6, "0"))
        return moment.replace(microsecond=micro, tzinfo=timezone.utc)

    def messages(self, recipient: str | None = None, subject_contains: str | None = None) -> list[dict]:
        data = self._get("/api/v1/messages")
        # Mailpit >= 1.26 отдаёт ключ «messages» с маленькой буквы, старые версии — «Messages».
        items = data.get("messages") or data.get("Messages") or []
        result = []
        for item in items:
            if recipient and recipient not in [to.get("Address", "") for to in (item.get("To") or [])]:
                continue
            if subject_contains and subject_contains.lower() not in (item.get("Subject") or "").lower():
                continue
            result.append(item)
        result.sort(key=lambda m: self.message_time(m.get("Created", "")), reverse=True)
        return result

    def body(self, message_id: str) -> str:
        data = self._get(f"/api/v1/message/{message_id}")
        text = data.get("Text") or ""
        if not text:
            html = data.get("HTML") or ""
            text = re.sub(r"<[^>]+>", " ", html)
        return text

    def latest_message(self, recipient: str, subject_contains: str | None = None,
                       since: datetime | None = None, timeout: float = 25.0) -> dict:
        """Ждёт появления самого свежего письма нужному адресату (новее `since`)."""
        deadline = time.time() + timeout
        since_utc = since.astimezone(timezone.utc) if since else None
        while time.time() < deadline:
            for message in self.messages(recipient, subject_contains):
                if since_utc and self.message_time(message.get("Created", "")) <= since_utc:
                    continue
                return message
            time.sleep(0.5)
        raise AssertionError(
            f"в Mailpit не появилось письмо для {recipient}"
            + (f" с темой «{subject_contains}»" if subject_contains else "")
        )

    def wait_for_login_code(self, recipient: str, since: datetime, timeout: float = 25.0) -> str:
        message = self.latest_message(recipient, "Код для входа", since=since, timeout=timeout)
        body = self.body(message["ID"])
        match = re.search(r"код для входа[:\s]*(\d{6})", body, re.IGNORECASE) or re.search(r"\b\d{6}\b", body)
        if not match:
            raise AssertionError(f"не удалось извлечь код из письма: {body[:400]}")
        return match.group(1)

    def wait_for_message_containing(self, recipient: str, needle: str,
                                    subject_contains: str | None = None,
                                    timeout: float = 40.0) -> dict:
        """Ждёт письмо нужному адресату, в теле которого есть `needle`.

        Используется для приглашений: письма уходят асинхронно после публикации,
        а в Mailpit уже лежат письма от предыдущих тестов, поэтому ориентироваться
        только на «самое свежее» нельзя.
        """
        deadline = time.time() + timeout
        while time.time() < deadline:
            for message in self.messages(recipient, subject_contains):
                if needle in self.body(message["ID"]):
                    return message
            time.sleep(1.0)
        raise AssertionError(
            f"письмо с «{needle}» для {recipient} не найдено в Mailpit за {timeout}с")

    def wait_for_invite_link(self, recipient: str, since: datetime, timeout: float = 40.0) -> str:
        message = self.latest_message(recipient, "Приглашение на опрос", since=since, timeout=timeout)
        body = self.body(message["ID"])
        match = re.search(r"href=\"([^\"]*login\?redirect[^\"]*)\"", body) or \
            re.search(r"(http://[^\s\"']+/login\?redirect=[^\s\"'<]+)", body)
        if not match:
            raise AssertionError(f"в письме-приглашении нет ссылки: {body[:400]}")
        return match.group(1).replace("&amp;", "&")

    def counts(self) -> int:
        return int(self._get("/api/v1/info").get("Messages", 0))


def message_text(resp: requests.Response) -> str:
    """Достаёт человекочитаемое сообщение об ошибке из ответа бэкенда.

    Контроллеры отдают и {"message": ...}, и ProblemDetails {"title"/"detail"},
    и голые строки — тестам нужен единый текст.
    """
    try:
        data = resp.json()
    except ValueError:
        return resp.text
    if isinstance(data, str):
        return data
    if isinstance(data, dict):
        for key in ("message", "detail", "title"):
            if data.get(key):
                return str(data[key])
        errors = data.get("errors")
        if isinstance(errors, dict):
            return " | ".join(f"{k}: {', '.join(v)}" for k, v in errors.items())
    return str(data)


def validation_errors(resp: requests.Response) -> dict:
    data = resp.json() if resp.content else {}
    return data.get("errors", {}) if isinstance(data, dict) else {}


def as_list(value: Any) -> list:
    return value if isinstance(value, list) else []
