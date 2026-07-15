namespace Directum360Feedback.Application.DTOs.RespondentTemplateDTOs;

public class CreateRespondentTemplateItemDto
{
    /// <summary>null — «сам оцениваемый» (допустимо только для SelfAssessment)</summary>
    public int? EmployeeId { get; set; }
}
