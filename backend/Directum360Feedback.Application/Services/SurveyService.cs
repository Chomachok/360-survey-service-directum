using AutoMapper;
using Directum360Feedback.Application.DTOs;
using Directum360Feedback.Application.Interfaces;
using Directum360Feedback.Domain.Entities;
using Directum360Feedback.Infrastructure.Repositories;

namespace Directum360Feedback.Application.Services;

public class SurveyService : ISurveyService
{
    private readonly IRepository<Survey> _surveyRepo;
    private readonly IRepository<Employee> _employeeRepo;
    private readonly IMapper _mapper;

    public SurveyService(IRepository<Survey> surveyRepo, IRepository<Employee> employeeRepo, IMapper mapper)
    {
        _surveyRepo = surveyRepo;
        _employeeRepo = employeeRepo;
        _mapper = mapper;
    }

    public async Task<IEnumerable<SurveyDto>> GetAllSurveysAsync()
    {
        var surveys = await _surveyRepo.GetAllAsync();
        var list = new List<SurveyDto>();
        foreach (var s in surveys)
        {
            var dto = _mapper.Map<SurveyDto>(s);
            var author = await _employeeRepo.GetByIdAsync(s.AuthorId);
            dto.AuthorName = author?.FullName ?? "Unknown";
            list.Add(dto);
        }
        return list;
    }

    public async Task<SurveyDto?> GetSurveyByIdAsync(int id)
    {
        var survey = await _surveyRepo.GetByIdAsync(id);
        if (survey == null) return null;
        var dto = _mapper.Map<SurveyDto>(survey);
        var author = await _employeeRepo.GetByIdAsync(survey.AuthorId);
        dto.AuthorName = author?.FullName ?? "Unknown";
        return dto;
    }

    public async Task<SurveyDto> CreateSurveyAsync(CreateSurveyDto dto)
    {
        var survey = _mapper.Map<Survey>(dto);
        survey.Status = Domain.Enums.SurveyStatus.Draft;
        await _surveyRepo.AddAsync(survey);
        await _surveyRepo.SaveChangesAsync();
        return _mapper.Map<SurveyDto>(survey);
    }

    public async Task<SurveyDto> UpdateSurveyAsync(int id, UpdateSurveyDto dto)
    {
        var survey = await _surveyRepo.GetByIdAsync(id);
        if (survey == null) throw new Exception("Survey not found");
        _mapper.Map(dto, survey);
        _surveyRepo.Update(survey);
        await _surveyRepo.SaveChangesAsync();
        return _mapper.Map<SurveyDto>(survey);
    }

    public async Task DeleteSurveyAsync(int id)
    {
        var survey = await _surveyRepo.GetByIdAsync(id);
        if (survey != null)
        {
            _surveyRepo.Delete(survey);
            await _surveyRepo.SaveChangesAsync();
        }
    }
}