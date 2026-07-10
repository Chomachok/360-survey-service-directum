using Survey360.Api.Enums;

namespace Survey360.Api.DTOs.Surveys;

public record SurveyResponse(
    int Id,
    string Title,
    SurveyStatus Status,
    DateTime StartDate,
    DateTime? EndDate,
    int? TemplateId,
    List<QuestionDto> Questions
);