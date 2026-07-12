## 📧 Настройка SMTP для отправки писем-приглашений

Для автоматической отправки приглашений респондентам мы используем SMTP-сервер. В режиме разработки рекомендуется использовать бесплатный сервис **Mailtrap**, который эмулирует отправку и позволяет просматривать письма в веб-интерфейсе.

---

### 1. Получение SMTP-данных (Mailtrap)

1. Зарегистрируйтесь на [Mailtrap.io](https://mailtrap.io/) (бесплатный тариф).
2. После входа создайте новый **Inbox** (кнопка «Add Inbox» → выберите тип SMTP).
3. Откройте созданный инбокс и перейдите во вкладку **SMTP Settings**.
4. Скопируйте:
   - **Host** (например, `sandbox.smtp.mailtrap.io`)
   - **Port** (например, `587` или `2525`)
   - **Username** (например, `abc123`)
   - **Password** (например, `def456`)

---

### 2. Настройка секретов (рекомендуемый способ)

Мы используем встроенный в .NET механизм `secrets.json`, чтобы хранить пароли вне кода и не коммитить их в репозиторий.

**Выполните в терминале (из папки `backend/Directum360Feedback.Api`):**

```bash
dotnet user-secrets init
dotnet user-secrets set "SmtpSettings:Host" "sandbox.smtp.mailtrap.io"
dotnet user-secrets set "SmtpSettings:Port" "587"
dotnet user-secrets set "SmtpSettings:EnableSsl" "true"
dotnet user-secrets set "SmtpSettings:Username" "ВАШ_ЛОГИН_ОТ_MAILTRAP"
dotnet user-secrets set "SmtpSettings:Password" "ВАШ_ПАРОЛЬ_ОТ_MAILTRAP"
dotnet user-secrets set "SmtpSettings:FromEmail" "noreply@directum360.com"
dotnet user-secrets set "SmtpSettings:FromName" "Directum360 Feedback"
```

Проверьте, что секреты сохранены:
```
dotnet user-secrets list
```