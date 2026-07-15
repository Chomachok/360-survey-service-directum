using Directum360Feedback.Domain.Entities;

namespace Directum360Feedback.Application.Interfaces;

public interface IEmailService
{
    Task SendSurveyInviteAsync(SurveyAssignment assignment, string baseUrl);
    Task SendEmailAsync(string toEmail, string subject, string body);
}