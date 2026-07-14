using Directum360Feedback.Domain.Enums;

namespace Directum360Feedback.Application.DTOs;

public class CreateRespondentTemplateItemDto
{
    /// <summary>null — «сам оцениваемый» (допустимо только для SelfAssessment)</summary>
    public int? EmployeeId { get; set; }
    public AssessmentRole Role { get; set; }
}
