using Microsoft.Extensions.DependencyInjection;
using Directum360Feedback.Application.Interfaces;
using Directum360Feedback.Application.Services;

namespace Directum360Feedback.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddAutoMapper(typeof(DependencyInjection));
        services.AddScoped<ISurveyService, SurveyService>();
        services.AddScoped<IQuestionService, QuestionService>();
        services.AddScoped<IMatrixService, MatrixService>();
        services.AddScoped<IPublicService, PublicService>();
        services.AddScoped<IResultService, ResultService>();
        services.AddScoped<IEmployeeService, EmployeeService>();
        return services;
    }
}