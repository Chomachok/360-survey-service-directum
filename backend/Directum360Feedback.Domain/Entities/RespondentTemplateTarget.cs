namespace Directum360Feedback.Domain.Entities;

/// <summary>
/// Оцениваемый сотрудник, «зашитый» в шаблон респондентов.
///
/// Если у шаблона есть такие записи — шаблон больше не «универсальный»:
/// при применении он сразу разворачивает матрицу для ВСЕХ перечисленных
/// оцениваемых (например, сразу для целого отдела), а не для одного
/// произвольно выбранного сотрудника.
///
/// Если записей нет — поведение прежнее: шаблон описывает только состав
/// оценивающих и применяется к тому оцениваемому, которого укажут вручную.
/// </summary>
public class RespondentTemplateTarget : BaseEntity
{
    public int TemplateId { get; set; }
    public RespondentTemplate Template { get; set; } = null!;

    public int EmployeeId { get; set; }
    public Employee Employee { get; set; } = null!;
}
