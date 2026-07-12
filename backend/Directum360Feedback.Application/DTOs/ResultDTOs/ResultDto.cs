namespace Directum360Feedback.Application.DTOs.ResultDTOs;

public class ResultDto
{
    public int SurveyId { get; set; }
    public string SurveyTitle { get; set; } = string.Empty;
    public List<EmployeeResultDto> Results { get; set; } = new();
}