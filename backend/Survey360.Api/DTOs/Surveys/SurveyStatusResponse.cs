using Survey360.Api.Enums;

namespace Survey360.Api.DTOs.Surveys;

public record SurveyStatusResponse(
    int SurveyId,
    SurveyStatus CurrentStatus,
    List<SurveyStatus> AvailableTransitions,
    string? ErrorMessage
);