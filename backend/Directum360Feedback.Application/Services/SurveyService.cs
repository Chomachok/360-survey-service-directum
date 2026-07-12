using AutoMapper;
using Directum360Feedback.Application.DTOs;
using Directum360Feedback.Application.Interfaces;
using Directum360Feedback.Domain.Entities;
using Directum360Feedback.Domain.Enums;
using Directum360Feedback.Infrastructure.Repositories;

namespace Directum360Feedback.Application.Services;

public class SurveyService(IRepository<Survey> surveyRepo, IRepository<Employee> employeeRepo, IMapper mapper)
    : ISurveyService
{
    public async Task<IEnumerable<SurveyDto>> GetAllSurveysAsync()
    {
        var surveys = await surveyRepo.GetAllAsync();
        var list = new List<SurveyDto>();
        foreach (var s in surveys)
        {
            var dto = mapper.Map<SurveyDto>(s);
            var author = await employeeRepo.GetByIdAsync(s.AuthorId);
            dto.AuthorName = author?.FullName ?? "Unknown";
            list.Add(dto);
        }
        return list;
    }

    public async Task<SurveyDto?> GetSurveyByIdAsync(int id)
    {
        var survey = await surveyRepo.GetByIdAsync(id);
        if (survey == null) return null;
        var dto = mapper.Map<SurveyDto>(survey);
        var author = await employeeRepo.GetByIdAsync(survey.AuthorId);
        dto.AuthorName = author?.FullName ?? "Unknown";
        return dto;
    }

    public async Task<SurveyDto> CreateSurveyAsync(CreateSurveyDto dto)
    {
        var survey = mapper.Map<Survey>(dto);
        survey.Status = SurveyStatus.Draft;
        await surveyRepo.AddAsync(survey);
        await surveyRepo.SaveChangesAsync();
        return mapper.Map<SurveyDto>(survey);
    }

    public async Task<SurveyDto> UpdateSurveyAsync(int id, UpdateSurveyDto dto)
    {
        var survey = await surveyRepo.GetByIdAsync(id);
        if (survey == null) throw new Exception("Survey not found");
        mapper.Map(dto, survey);
        surveyRepo.Update(survey);
        await surveyRepo.SaveChangesAsync();
        return mapper.Map<SurveyDto>(survey);
    }

    public async Task DeleteSurveyAsync(int id)
    {
        var survey = await surveyRepo.GetByIdAsync(id);
        if (survey != null)
        {
            surveyRepo.Delete(survey);
            await surveyRepo.SaveChangesAsync();
        }
    }
    
    public async Task<SurveyDto> PublishSurveyAsync(int id)
    {
        var survey = await surveyRepo.GetByIdAsync(id);
        if (survey == null)
            throw new Exception("Survey not found");

        if (survey.Status != SurveyStatus.Draft)
            throw new Exception("Only drafts can be published");

        survey.Status = SurveyStatus.Active;
        surveyRepo.Update(survey);
        await surveyRepo.SaveChangesAsync();

        var dto = mapper.Map<SurveyDto>(survey);
        var author = await employeeRepo.GetByIdAsync(survey.AuthorId);
        dto.AuthorName = author?.FullName ?? "Unknown";
        return dto;
    }
    
    public async Task<SurveyDto> CompleteSurveyAsync(int id)
    {
        var survey = await surveyRepo.GetByIdAsync(id);
        if (survey == null)
            throw new Exception("Survey not found");

        if (survey.Status != SurveyStatus.Active)
            throw new Exception("Only active surveys can be completed");

        survey.Status = SurveyStatus.Completed;
        surveyRepo.Update(survey);
        await surveyRepo.SaveChangesAsync();

        var dto = mapper.Map<SurveyDto>(survey);
        var author = await employeeRepo.GetByIdAsync(survey.AuthorId);
        dto.AuthorName = author?.FullName ?? "Unknown";
        return dto;
    }

    public async Task<IEnumerable<SurveyDto>> GetAllSurveyAsync(string? status, string? search = null)
    {
        var surveys = await surveyRepo.GetAllAsync();
        var query = surveys.AsQueryable();

        if (!string.IsNullOrEmpty(status) && Enum.TryParse<SurveyStatus>(status, true, out var statusEnum))
        {
            query = query.Where(s => s.Status == statusEnum);
        }

        if (!string.IsNullOrEmpty(search))
        {
            var searchLower = search.ToLower();
            query = query.Where(s => s.Title.ToLower().Contains(searchLower));
        }

        var result = new List<SurveyDto>();
        foreach (var survey in query)
        {
            var dto = mapper.Map<SurveyDto>(survey);    
            var author = await employeeRepo.GetByIdAsync(survey.AuthorId);
            dto.AuthorName = author?.FullName ?? "Unknown";
            result.Add(dto);
        }

        return result;
    }
}