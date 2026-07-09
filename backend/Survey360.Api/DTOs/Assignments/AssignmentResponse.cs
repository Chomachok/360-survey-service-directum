namespace Survey360.Api.DTOs.Assignments;

public record AssignmentResponse(
    int Id, 
    int SurveyId, 
    string EvaluatorName, 
    string EvaluateeName, 
    string Status
);