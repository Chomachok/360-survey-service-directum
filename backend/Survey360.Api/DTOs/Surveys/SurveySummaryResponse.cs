using Survey360.Api.Enums;

namespace Survey360.Api.DTOs.Surveys;

public record SurveySummaryResponse(
    int Id, 
    string Title, 
    SurveyStatus Status, 
    int TotalAssignments,     // Всего назначений
    int CompletedAssignments, // Сколько из них уже выполнено
    DateTime StartDate
);