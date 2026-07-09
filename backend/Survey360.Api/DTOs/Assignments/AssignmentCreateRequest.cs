namespace Survey360.Api.DTOs.Assignments;

// Используется для импорта или создания матрицы: один респондент оценивает одного сотрудника
public record AssignmentCreateRequest(int SurveyId, int EvaluatorId, int EvaluateeId);