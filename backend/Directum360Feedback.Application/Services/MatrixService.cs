using AutoMapper;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Directum360Feedback.Application.DTOs;
using Directum360Feedback.Application.Interfaces;
using Directum360Feedback.Domain.Entities;
using Directum360Feedback.Infrastructure.Repositories;

namespace Directum360Feedback.Application.Services;

public class MatrixService(
    IRepository<SurveyAssignment> assignmentRepo,
    IRepository<Survey> surveyRepo,
    IRepository<Employee> employeeRepo,
    IMapper mapper,
    IEmailService emailService,
    IConfiguration configuration,
    IServiceScopeFactory scopeFactory)
    : IMatrixService
{
    private readonly IEmailService _emailService = emailService;
    private readonly string _baseUrl = configuration["BaseUrl"] ?? "http://localhost:5173";

    public async Task<IEnumerable<MatrixItemDto>> GetMatrixForSurveyAsync(int surveyId)
    {
        var assignments = await assignmentRepo.FindAsync(a => a.SurveyId == surveyId);
        var result = new List<MatrixItemDto>();
        foreach (var a in assignments)
        {
            var dto = mapper.Map<MatrixItemDto>(a);
            var evaluator = await employeeRepo.GetByIdAsync(a.EvaluatorId);
            var target = await employeeRepo.GetByIdAsync(a.TargetId);
            dto.EvaluatorName = evaluator?.FullName ?? "Unknown";
            dto.TargetName = target?.FullName ?? "Unknown";
            result.Add(dto);
        }
        return result;
    }

    public async Task<MatrixItemDto> AddMatrixItemAsync(int surveyId, CreateMatrixItemDto dto)
    {
        var survey = await surveyRepo.GetByIdAsync(surveyId);
        if (survey == null)
            throw new Exception("Survey not found");

        // Проверяем, что evaluator и target существуют
        var evaluator = await employeeRepo.GetByIdAsync(dto.EvaluatorId);
        if (evaluator == null)
            throw new Exception("Evaluator not found");
        var target = await employeeRepo.GetByIdAsync(dto.TargetId);
        if (target == null)
            throw new Exception("Target not found");

        // Для самооценки проверяем, что evaluator и target совпадают
        if (dto.Role == Domain.Enums.AssessmentRole.SelfAssessment && dto.EvaluatorId != dto.TargetId)
            throw new Exception("Для самооценки оценивающий и оцениваемый должны быть одним сотрудником");

        var assignment = mapper.Map<SurveyAssignment>(dto);
        assignment.SurveyId = surveyId;
        assignment.Token = Guid.NewGuid().ToString();
        assignment.InviteSent = false;

        await assignmentRepo.AddAsync(assignment);
        await assignmentRepo.SaveChangesAsync();

        // Фоновая отправка письма (используем отдельный scope)
        _ = Task.Run(async () =>
        {
            try
            {
                using (var scope = scopeFactory.CreateScope())
                {
                    var scopedAssignmentRepo = scope.ServiceProvider.GetRequiredService<IRepository<SurveyAssignment>>();
                    var scopedEmailService = scope.ServiceProvider.GetRequiredService<IEmailService>();

                    // Загружаем назначение с навигационными свойствами
                    var fullAssignment = (await scopedAssignmentRepo.FindAsync(
                        a => a.Id == assignment.Id,
                        a => a.Evaluator,
                        a => a.Target
                    )).FirstOrDefault();

                    if (fullAssignment != null && fullAssignment.Evaluator != null && !string.IsNullOrEmpty(fullAssignment.Evaluator.Email))
                    {
                        await scopedEmailService.SendSurveyInviteAsync(fullAssignment, _baseUrl);
                        fullAssignment.InviteSent = true;
                        scopedAssignmentRepo.Update(fullAssignment);
                        await scopedAssignmentRepo.SaveChangesAsync();
                        Console.WriteLine($"✅ Письмо отправлено для Assignment {fullAssignment.Id} ({fullAssignment.Evaluator.Email})");
                    }
                    else
                    {
                        Console.WriteLine($"⚠️ Письмо не отправлено: у оценивающего отсутствует email или назначение не найдено");
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Ошибка отправки письма: {ex.Message}");
            }
        });

        return mapper.Map<MatrixItemDto>(assignment);
    }

    public async Task RemoveMatrixItemAsync(int assignmentId)
    {
        var assignment = await assignmentRepo.GetByIdAsync(assignmentId);
        if (assignment == null)
            throw new Exception("Assignment not found");
        assignmentRepo.Delete(assignment);
        await assignmentRepo.SaveChangesAsync();
    }
}