namespace Directum360Feedback.Application.DTOs;

/// <summary>Применить шаблон респондентов к опросу для конкретного оцениваемого</summary>
public class ApplyRespondentTemplateDto
{
    public int TemplateId { get; set; }
    public int TargetId { get; set; }
}
