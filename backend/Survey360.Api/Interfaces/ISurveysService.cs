using Survey360.Api.DTOs;

namespace Survey360.Api.Services;

public interface ISurveysService
{
    // Опросы
    Task<IEnumerable<SurveyDto>> GetAllSurveysAsync();
    Task<SurveyDto?> GetSurveyByIdAsync(int id);
    Task<SurveyDto> CreateSurveyAsync(CreateSurveyDto dto);
    Task<bool> UpdateSurveyAsync(int id, UpdateSurveyDto dto);
    Task<bool> DeleteSurveyAsync(int id);
    Task<bool> ChangeSurveyStatusAsync(int id, string status);

    // Вопросы опроса
    Task<IEnumerable<SurveyQuestionDto>> GetSurveyQuestionsAsync(int surveyId);
    Task<SurveyQuestionDto?> AddQuestionFromTemplateAsync(int surveyId, AddQuestionDto dto);
    Task<bool> UpdateQuestionOrderAsync(int surveyId, int questionId, int newOrder);
    Task<bool> UpdateQuestionRequiredAsync(int surveyId, int questionId, bool isRequired);
    Task<bool> DeleteQuestionFromSurveyAsync(int surveyId, int questionId);
}