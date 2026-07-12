using Microsoft.Extensions.DependencyInjection;
using Directum360Feedback.Application.Interfaces;
using Directum360Feedback.Application.Services;
using Directum360Feedback.Domain.Settings;
using Microsoft.Extensions.Configuration;

namespace Directum360Feedback.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddAutoMapper(typeof(DependencyInjection));
        services.AddScoped<ISurveyService, SurveyService>();
        services.AddScoped<IQuestionService, QuestionService>();
        services.AddScoped<IMatrixService, MatrixService>();
        services.AddScoped<IPublicService, PublicService>();
        services.AddScoped<IResultService, ResultService>();
        services.AddScoped<IEmployeeService, EmployeeService>();
        var smtpSettings = configuration.GetSection("SmtpSettings").Get<SmtpSettings>();
        services.Configure<SmtpSettings>(options =>
        {
            options.Host = smtpSettings.Host;
            options.Port = smtpSettings.Port;
            options.EnableSsl = smtpSettings.EnableSsl;
            options.Username = smtpSettings.Username;
            options.Password = smtpSettings.Password;
            options.FromEmail = smtpSettings.FromEmail;
            options.FromName = smtpSettings.FromName;
        });
        services.AddScoped<IEmailService, EmailService>();
        return services;
    }
}