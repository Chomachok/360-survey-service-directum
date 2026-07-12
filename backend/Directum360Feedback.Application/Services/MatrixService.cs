using AutoMapper;
using Directum360Feedback.Application.DTOs;
using Directum360Feedback.Application.Interfaces;
using Directum360Feedback.Domain.Entities;
using Directum360Feedback.Infrastructure.Repositories;

namespace Directum360Feedback.Application.Services;

public class MatrixService(
    IRepository<SurveyAssignment> assignmentRepo,
    IRepository<Survey> surveyRepo,
    IRepository<Employee> employeeRepo,
    IMapper mapper)
    : IMatrixService
{
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

        var evaluator = await employeeRepo.GetByIdAsync(dto.EvaluatorId);
        if (evaluator == null)
            throw new Exception("Evaluator not found");
        var target = await employeeRepo.GetByIdAsync(dto.TargetId);
        if (target == null)
            throw new Exception("Target not found");

        if (dto.Role == Domain.Enums.AssessmentRole.SelfAssessment && dto.EvaluatorId != dto.TargetId)
            throw new Exception("Для самооценки оценивающий и оцениваемый должны быть одним сотрудником");

        var assignment = mapper.Map<SurveyAssignment>(dto);
        assignment.SurveyId = surveyId;
        assignment.Token = Guid.NewGuid().ToString();
        assignment.InviteSent = false; // по умолчанию false

        await assignmentRepo.AddAsync(assignment);
        await assignmentRepo.SaveChangesAsync();

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