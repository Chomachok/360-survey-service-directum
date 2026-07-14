using Directum360Feedback.Domain.Enums;

namespace Directum360Feedback.Domain.Entities;

/// <summary>
/// Один респондент внутри шаблона.
///
/// EmployeeId == null означает «сам оцениваемый» и допустим только для роли SelfAssessment:
/// благодаря этому один и тот же шаблон можно применить к любому сотруднику,
/// и самооценка каждый раз назначится на нужного человека.
/// </summary>
public class RespondentTemplateItem : BaseEntity
{
    public int TemplateId { get; set; }
    public RespondentTemplate Template { get; set; } = null!;

    /// <summary>Оценивающий. null — «сам оцениваемый» (самооценка).</summary>
    public int? EmployeeId { get; set; }
    public Employee? Employee { get; set; }

    public AssessmentRole Role { get; set; }
}
