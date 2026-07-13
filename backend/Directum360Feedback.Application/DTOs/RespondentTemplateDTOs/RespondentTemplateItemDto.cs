using Directum360Feedback.Domain.Enums;

namespace Directum360Feedback.Application.DTOs;

public class RespondentTemplateItemDto
{
    public int Id { get; set; }
    /// <summary>null — «сам оцениваемый» (самооценка)</summary>
    public int? EmployeeId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public AssessmentRole Role { get; set; }
}
