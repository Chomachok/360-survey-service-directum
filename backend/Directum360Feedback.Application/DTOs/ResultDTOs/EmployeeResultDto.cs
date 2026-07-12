namespace Directum360Feedback.Application.DTOs.ResultDTOs;

public class EmployeeResultDto
{
    public int EmployeeId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public List<EvaluatorResultDto> Evaluators { get; set; } = new();
}
