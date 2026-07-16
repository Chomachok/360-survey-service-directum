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
        services.Configure<SmtpSettings>(configuration.GetSection("SmtpSettings"));
        services.AddScoped<IEmailService, EmailService>();
        services.AddScoped<ISurveyService, SurveyService>();
        services.AddScoped<IQuestionService, QuestionService>();
        services.AddScoped<IMatrixService, MatrixService>();
        services.AddScoped<IPublicService, PublicService>();
        services.AddScoped<IResultService, ResultService>();
        services.AddScoped<IEmployeeService, EmployeeService>();
        services.AddScoped<IRespondentTemplateService, RespondentTemplateService>();
        services.AddScoped<ISurveyTemplateService, SurveyTemplateService>();
        services.Configure<JwtSettings>(configuration.GetSection("JwtSettings"));
        services.AddScoped<IAuthService, AuthService>();
        services.AddAutoMapper(typeof(DependencyInjection));
        return services;
    }
}