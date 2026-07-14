using Directum360Feedback.Application.DTOs;

namespace Directum360Feedback.Application.Interfaces;

public interface IQuestionService
{
    Task<IEnumerable<QuestionDto>> GetSurveyQuestionsAsync(int surveyId);
    Task<QuestionDto> AddQuestionToSurveyAsync(int surveyId, CreateQuestionDto dto);
    Task RemoveQuestionAsync(int questionId);
    Task<IEnumerable<QuestionTemplateDto>> GetTemplatesAsync();
    Task<QuestionTemplateDto> CreateTemplateAsync(CreateQuestionTemplateDto dto);
    Task<QuestionTemplateDto> UpdateTemplateAsync(int id, UpdateQuestionTemplateDto dto);
    Task DeleteTemplateAsync(int id);
    Task<QuestionDto> UpdateQuestionAsync(int id, UpdateQuestionDto dto);
    Task UpdateQuestionsOrderAsync(int surveyId, List<UpdateQuestionOrderDto> updatedOrders);
}