namespace Survey360.Api.DTOs.Surveys;

public record SurveyCreateRequest(
    string Title, 
    string? Description,
    DateTime StartDate, 
    DateTime EndDate,
    int? TemplateId,
    List<QuestionRequestDto>? CustomQuestions 
);  