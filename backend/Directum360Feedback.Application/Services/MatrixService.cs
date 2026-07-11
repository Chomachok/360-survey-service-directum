using AutoMapper;
using Directum360Feedback.Application.DTOs;
using Directum360Feedback.Application.Interfaces;
using Directum360Feedback.Domain.Entities;
using Directum360Feedback.Infrastructure.Repositories;

namespace Directum360Feedback.Application.Services;

public class MatrixService : IMatrixService
{
    private readonly IRepository<SurveyAssignment> _assignmentRepo;
    private readonly IRepository<Survey> _surveyRepo;
    private readonly IRepository<Employee> _employeeRepo;
    private readonly IMapper _mapper;

    public MatrixService(IRepository<SurveyAssignment> assignmentRepo, IRepository<Survey> surveyRepo,
        IRepository<Employee> employeeRepo, IMapper mapper)
    {
        _assignmentRepo = assignmentRepo;
        _surveyRepo = surveyRepo;
        _employeeRepo = employeeRepo;
        _mapper = mapper;
    }

    public async Task<IEnumerable<MatrixItemDto>> GetMatrixForSurveyAsync(int surveyId)
    {
        var assignments = await _assignmentRepo.FindAsync(a => a.SurveyId == surveyId);
        var result = new List<MatrixItemDto>();
        foreach (var a in assignments)
        {
            var dto = _mapper.Map<MatrixItemDto>(a);
            var evaluator = await _employeeRepo.GetByIdAsync(a.EvaluatorId);
            var target = await _employeeRepo.GetByIdAsync(a.TargetId);
            dto.EvaluatorName = evaluator?.FullName ?? "Unknown";
            dto.TargetName = target?.FullName ?? "Unknown";
            result.Add(dto);
        }
        return result;
    }

    public async Task<MatrixItemDto> AddMatrixItemAsync(int surveyId, CreateMatrixItemDto dto)
    {
        var survey = await _surveyRepo.GetByIdAsync(surveyId);
        if (survey == null) throw new Exception("Survey not found");
        var assignment = _mapper.Map<SurveyAssignment>(dto);
        assignment.SurveyId = surveyId;
        assignment.Token = Guid.NewGuid().ToString();
        await _assignmentRepo.AddAsync(assignment);
        await _assignmentRepo.SaveChangesAsync();
        return _mapper.Map<MatrixItemDto>(assignment);
    }

    public async Task RemoveMatrixItemAsync(int assignmentId)
    {
        var a = await _assignmentRepo.GetByIdAsync(assignmentId);
        if (a != null)
        {
            _assignmentRepo.Delete(a);
            await _assignmentRepo.SaveChangesAsync();
        }
    }
}