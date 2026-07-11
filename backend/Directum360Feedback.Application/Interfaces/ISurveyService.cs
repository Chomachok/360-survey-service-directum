using Directum360Feedback.Application.DTOs;

namespace Directum360Feedback.Application.Interfaces;

public interface ISurveyService
{
    Task<IEnumerable<SurveyDto>> GetAllSurveysAsync();
    Task<SurveyDto?> GetSurveyByIdAsync(int id);
    Task<SurveyDto> CreateSurveyAsync(CreateSurveyDto dto);
    Task<SurveyDto> UpdateSurveyAsync(int id, UpdateSurveyDto dto);
    Task DeleteSurveyAsync(int id);
    Task<SurveyDto> PublishSurveyAsync(int id);
    Task<SurveyDto> CompleteSurveyAsync(int id);
}