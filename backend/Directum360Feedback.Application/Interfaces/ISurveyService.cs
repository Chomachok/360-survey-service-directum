using Directum360Feedback.Application.DTOs;
using Directum360Feedback.Application.DTOs.SurveyTemplateDTOs;

namespace Directum360Feedback.Application.Interfaces;

public interface ISurveyService
{
    Task<IEnumerable<SurveyDto>> GetAllSurveysAsync(string? status = null, string? search = null);
    Task<SurveyDto?> GetSurveyByIdAsync(int id);
    Task<SurveyDto> CreateSurveyAsync(CreateSurveyDto dto);
    Task<SurveyDto> UpdateSurveyAsync(int id, UpdateSurveyDto dto);
    Task DeleteSurveyAsync(int id);
    Task<SurveyDto> PublishSurveyAsync(int id);
    Task<SurveyDto> CompleteSurveyAsync(int id);
    Task ApplyTemplateToSurveyAsync(int surveyId, int templateId);
    Task<SurveyTemplateDto> SaveSurveyAsTemplateAsync(int surveyId, string templateName, string? templateDescription);
}