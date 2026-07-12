using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Options;
using Directum360Feedback.Domain.Entities;
using Directum360Feedback.Domain.Settings;
using Directum360Feedback.Application.Interfaces;

namespace Directum360Feedback.Application.Services;

public class EmailService(IOptions<SmtpSettings> smtpSettings) : IEmailService
{
    private readonly SmtpSettings _smtpSettings = smtpSettings.Value;

    public async Task SendSurveyInviteAsync(SurveyAssignment assignment, string baseUrl)
    {
        var evaluator = assignment.Evaluator;
        if (evaluator == null || string.IsNullOrEmpty(evaluator.Email))
            throw new Exception("У оценивающего не указан email");

        var targetName = assignment.Target?.FullName ?? "сотрудника";
        var roleName = assignment.Role switch
        {
            Domain.Enums.AssessmentRole.SelfAssessment => "самооценку",
            Domain.Enums.AssessmentRole.Manager => "оценку руководителем",
            _ => "оценку коллегой"
        };

        var surveyLink = $"{baseUrl.TrimEnd('/')}/survey/{assignment.Token}";

        var subject = $"Приглашение на опрос 360 градусов для {targetName}";
        var body = $@"
            <h2>Здравствуйте, {evaluator.FullName}!</h2>
            <p>Вас пригласили пройти опрос 360 градусов для сотрудника <strong>{targetName}</strong>.</p>
            <p>Ваша роль: <strong>{roleName}</strong>.</p>
            <p>Чтобы пройти опрос, перейдите по ссылке:</p>
            <p><a href='{surveyLink}'>{surveyLink}</a></p>
            <p>Ссылка действительна только для вас.</p>
            <br/>
            <p>С уважением,<br/>Команда Directum360</p>
        ";

        using var client = new SmtpClient(_smtpSettings.Host, _smtpSettings.Port)
        {
            EnableSsl = _smtpSettings.EnableSsl,
            Credentials = new NetworkCredential(_smtpSettings.Username, _smtpSettings.Password)
        };

        var mailMessage = new MailMessage
        {
            From = new MailAddress(_smtpSettings.FromEmail, _smtpSettings.FromName),
            Subject = subject,
            Body = body,
            IsBodyHtml = true
        };
        mailMessage.To.Add(evaluator.Email);

        await client.SendMailAsync(mailMessage);
    }
}