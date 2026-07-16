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
            if (string.IsNullOrEmpty(evaluator.Email))
            {
                logger.LogError("У оценивающего (EvaluatorId={EvaluatorId}) не указан email", assignment.EvaluatorId);
                throw new Exception("У оценивающего не указан email");
            }

            var targetName = assignment.Target.FullName;

            var surveyLink = $"{baseUrl.TrimEnd('/')}/survey/{assignment.Token}";

            // Загружаем HTML-шаблон из файла
            var htmlBody = await GetHtmlTemplateAsync("InviteEmail.html");
            htmlBody = htmlBody
                .Replace("{{FullName}}", evaluator.FullName)
                .Replace("{{TargetName}}", targetName)
                .Replace("{{SurveyLink}}", surveyLink);

            var subject = $"Приглашение на опрос 360 градусов для {targetName}";

            using var client = new SmtpClient(_smtpSettings.Host, _smtpSettings.Port);
            client.EnableSsl = _smtpSettings.EnableSsl;
            client.Credentials = new NetworkCredential(_smtpSettings.Username, _smtpSettings.Password);

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

    private async Task<string> GetHtmlTemplateAsync(string templateName)
    {
        var possiblePaths = new List<string>
        {
            Path.Combine(AppContext.BaseDirectory, "Templates", templateName),
            Path.Combine(Directory.GetCurrentDirectory(), "Templates", templateName),
            Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Templates", templateName)
        };

        foreach (var path in possiblePaths)
        {
            if (File.Exists(path))
            {
                logger.LogInformation($"✅ Найден файл шаблона: {path}");
                var content = await File.ReadAllTextAsync(path);
                return content;
            }

            logger.LogWarning($"❌ Файл не найден: {path}");
        }

        throw new FileNotFoundException($"Шаблон {templateName} не найден ни по одному из путей");
    }
    
    public async Task SendCodeEmailAsync(string toEmail, string fullName, string code)
    {
        var htmlBody = await GetHtmlTemplateAsync("CodeEmail.html");
        
        htmlBody = htmlBody
            .Replace("{{FullName}}", fullName)
            .Replace("{{Code}}", code);

        var subject = "Код для входа в Directum360";

        using var client = new SmtpClient(_smtpSettings.Host, _smtpSettings.Port);
        client.EnableSsl = _smtpSettings.EnableSsl;
        client.Credentials = new NetworkCredential(_smtpSettings.Username, _smtpSettings.Password);

        var mailMessage = new MailMessage
        {
            From = new MailAddress(_smtpSettings.FromEmail, _smtpSettings.FromName),
            Subject = subject,
            Body = htmlBody,
            IsBodyHtml = true
        };
        mailMessage.To.Add(toEmail);

        await client.SendMailAsync(mailMessage);
    }
}