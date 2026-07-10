using Survey360.Api.Enums;

namespace Survey360.Api.DTOs.Surveys;

public record SurveyStatusRequest(
    SurveyStatus NewStatus
);