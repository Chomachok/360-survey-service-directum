using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Directum360Feedback.Domain.Entities;
using Directum360Feedback.Domain.Settings;
using Directum360Feedback.Application.Interfaces;

namespace Directum360Feedback.Application.Services;

public class EmailService(IOptions<SmtpSettings> smtpSettings, ILogger<EmailService> logger)
    : IEmailService
{
    private readonly SmtpSettings _smtpSettings = smtpSettings.Value;

    public async Task SendSurveyInviteAsync(SurveyAssignment assignment, string baseUrl)
    {
        logger.LogInformation("Начало отправки письма для Assignment {AssignmentId}", assignment.Id);

        try
        {
            var evaluator = assignment.Evaluator;
            if (evaluator == null || string.IsNullOrEmpty(evaluator.Email))
            {
                logger.LogError("У оценивающего (EvaluatorId={EvaluatorId}) не указан email", assignment.EvaluatorId);
                throw new Exception("У оценивающего не указан email");
            }

            var targetName = assignment.Target?.FullName ?? "сотрудника";

            var surveyLink = $"{baseUrl.TrimEnd('/')}/survey/{assignment.Token}";

            // Загружаем HTML-шаблон из файла
            var htmlBody = await GetHtmlTemplateAsync();
            htmlBody = htmlBody
                .Replace("{{FullName}}", evaluator.FullName)
                .Replace("{{TargetName}}", targetName)
                .Replace("{{SurveyLink}}", surveyLink);

            var subject = $"Приглашение на опрос 360 градусов для {targetName}";

            using var client = new SmtpClient(_smtpSettings.Host, _smtpSettings.Port)
            {
                EnableSsl = _smtpSettings.EnableSsl,
                Credentials = new NetworkCredential(_smtpSettings.Username, _smtpSettings.Password)
            };

            var mailMessage = new MailMessage
            {
                From = new MailAddress(_smtpSettings.FromEmail, _smtpSettings.FromName),
                Subject = subject,
                Body = htmlBody,
                IsBodyHtml = true
            };
            mailMessage.To.Add(evaluator.Email);

            await client.SendMailAsync(mailMessage);
            logger.LogInformation("✅ Письмо успешно отправлено на {Email}", evaluator.Email);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "❌ Ошибка отправки письма для Assignment {AssignmentId}: {ErrorMessage}", 
                assignment.Id, ex.Message);
            throw;
        }
    }

    private async Task<string> GetHtmlTemplateAsync()
    {
        // Получаем текущую директорию и базовую директорию
        var currentDir = Directory.GetCurrentDirectory();
        var baseDir = AppContext.BaseDirectory;
        var appDomainDir = AppDomain.CurrentDomain.BaseDirectory;

        // Формируем список возможных путей
        var possiblePaths = new List<string>
        {
            // Путь относительно папки запуска (обычно bin/Debug/net10.0/)
            Path.Combine(baseDir, "Templates", "InviteEmail.html"),
            
            // Путь относительно текущей рабочей директории (если запуск из корня проекта)
            Path.Combine(currentDir, "Templates", "InviteEmail.html"),
            
            // Путь относительно папки с приложением (альтернативный вариант)
            Path.Combine(appDomainDir, "Templates", "InviteEmail.html"),
            
            // Путь на уровень выше (если запуск из корня решения)
            Path.Combine(currentDir, "..", "Directum360Feedback.Api", "Templates", "InviteEmail.html"),
            
            // Абсолютный путь, если вы знаете точное место (для отладки)
            // @"C:\Users\Windows\Учёба\360-survey-service-directum\backend\Directum360Feedback.Api\Templates\InviteEmail.html"
        };

        // Логируем все пути, которые будем проверять
        logger.LogInformation("🔍 Поиск файла шаблона по следующим путям:");
        foreach (var path in possiblePaths)
        {
            logger.LogInformation("   - {Path}", path);
        }

        // Проверяем каждый путь
        foreach (var path in possiblePaths)
        {
            if (File.Exists(path))
            {
                logger.LogInformation("✅ Найден файл шаблона: {TemplatePath}", path);
                return await File.ReadAllTextAsync(path);
            }
            else
            {
                logger.LogDebug("❌ Файл не найден: {TemplatePath}", path);
            }
        }

        // Если ни один путь не подошёл, выбрасываем исключение с подробным сообщением
        var errorMessage = 
            $"Не найден файл шаблона письма InviteEmail.html.\n" +
            $"Проверены следующие пути:\n{string.Join("\n", possiblePaths.Select(p => $"  - {p}"))}\n" +
            "Убедитесь, что:\n" +
            "1. Файл существует в папке Templates проекта Directum360Feedback.Api.\n" +
            "2. В .csproj добавлена настройка CopyToOutputDirectory = PreserveNewest.\n" +
            "3. Проект пересобран (dotnet build).";

        logger.LogError(errorMessage);
        throw new FileNotFoundException(errorMessage);
    }
}