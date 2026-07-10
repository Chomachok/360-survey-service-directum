namespace Survey360.Api.DTOs.Surveys;

public record UpdateSurveyStatusRequest(
    int SurveyId,
    string Status
);