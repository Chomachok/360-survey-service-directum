namespace Directum360Feedback.Application.DTOs;

/// <summary>
/// Применить шаблон респондентов к опросу.
/// Оцениваемый берётся из самого опроса (Survey.TargetId) — опрос 360 проводится
/// для одного конкретного сотрудника, поэтому отдельно его указывать не нужно.
/// </summary>
public class ApplyRespondentTemplateDto
{
    public int TemplateId { get; set; }
}
