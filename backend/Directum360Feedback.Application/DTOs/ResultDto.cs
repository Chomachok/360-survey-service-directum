using Directum360Feedback.Domain.Enums;

namespace Directum360Feedback.Application.DTOs;

public class ResultDto
{
    public int SurveyId { get; set; }
    public string SurveyTitle { get; set; } = string.Empty;
    public List<EmployeeResultDto> Results { get; set; } = new();
}

public class EmployeeResultDto
{
    public int EmployeeId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public Dictionary<AssessmentRole, List<QuestionAnswerDto>> AnswersByRole { get; set; } = new();
}

public class QuestionAnswerDto
{
    public string QuestionText { get; set; } = string.Empty;
    public string? AnswerText { get; set; }
    public string? SelectedOption { get; set; }
}