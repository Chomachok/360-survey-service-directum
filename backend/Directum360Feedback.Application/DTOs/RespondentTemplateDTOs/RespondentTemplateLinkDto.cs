namespace Directum360Feedback.Application.DTOs.RespondentTemplateDTOs;

/// <summary>Явная связь «этот оценивающий оценивает этого оцениваемого» внутри шаблона.</summary>
public class RespondentTemplateLinkDto
{
    public int EvaluatorEmployeeId { get; set; }
    public int TargetEmployeeId { get; set; }
}
