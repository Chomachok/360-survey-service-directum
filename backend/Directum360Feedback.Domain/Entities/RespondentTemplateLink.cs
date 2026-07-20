namespace Directum360Feedback.Domain.Entities;

/// <summary>
/// Явная связь «этот оценивающий оценивает этого оцениваемого» внутри шаблона.
///
/// Нужна, когда состав неоднороден: не каждый оценивающий должен оценивать
/// каждого зашитого в шаблон оцениваемого (частичная матрица).
///
/// Если у шаблона нет ни одной связи — считается, что действует старое поведение:
/// каждый оценивающий (Items) оценивает каждого зашитого оцениваемого (Targets),
/// то есть полный «крест» связей.
/// </summary>
public class RespondentTemplateLink : BaseEntity
{
    public int TemplateId { get; set; }
    public RespondentTemplate Template { get; set; } = null!;

    public int EvaluatorEmployeeId { get; set; }
    public Employee EvaluatorEmployee { get; set; } = null!;

    public int TargetEmployeeId { get; set; }
    public Employee TargetEmployee { get; set; } = null!;
}
