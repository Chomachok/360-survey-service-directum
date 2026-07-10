using Survey360.Api.DTOs.Surveys;
using Survey360.Api.DTOs.Templates;
using Survey360.Api.DTOs.Assignments;
using Survey360.Api.DTOs.Answers;
using Survey360.Api.Enums;

namespace Survey360.Api.Interfaces;

public interface ISurveysService
{
    // ========== ОПРОСЫ ==========
    Task<IEnumerable<SurveySummaryResponse>> GetAllSurveysAsync();
    Task<SurveyResponse?> GetSurveyByIdAsync(int id);
    Task<SurveyResponse> CreateSurveyAsync(SurveyCreateRequest request);
    Task<bool> DeleteSurveyAsync(int id);

    // ========== ВОПРОСЫ ОПРОСА ==========
    Task<IEnumerable<TemplateQuestionDto>> GetSurveyQuestionsAsync(int surveyId);

    // ========== МАТРИЦА ОПРАШИВАЕМЫХ ==========
    Task<AssignmentResponse> CreateAssignmentAsync(AssignmentCreateRequest request);
    Task<IEnumerable<AssignmentResponse>> GetSurveyAssignmentsAsync(int surveyId);
    Task<bool> DeleteAssignmentAsync(int assignmentId);

    // ========== ПРОХОЖДЕНИЕ ОПРОСА ==========
    Task<AnswerResponse> SubmitAnswerAsync(AnswerSubmitRequest request);
    Task<IEnumerable<AnswerResponse>> GetRespondentAnswersAsync(int assignmentId);

    // ========== РЕЗУЛЬТАТЫ ==========
    Task<IEnumerable<AnswerResponse>> GetSurveyResultsAsync(int surveyId, int evaluateeId);

    // ========== СТАТУСЫ ОПРОСА ==========
    Task<SurveyStatusResponse> GetAvailableStatusTransitionsAsync(int surveyId);
    Task<bool> ChangeSurveyStatusAsync(int surveyId, SurveyStatus newStatus);

}