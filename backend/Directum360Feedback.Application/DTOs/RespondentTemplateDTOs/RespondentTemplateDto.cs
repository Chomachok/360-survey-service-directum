namespace Directum360Feedback.Application.DTOs.RespondentTemplateDTOs;

public class RespondentTemplateDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public List<RespondentTemplateItemDto> Items { get; set; } = new();
    /// <summary>Оцениваемые, «зашитые» в шаблон. Пусто — шаблон универсальный.</summary>
    public List<RespondentTemplateTargetDto> Targets { get; set; } = new();
    /// <summary>
    /// Явные связи «кто кого оценивает». Пусто — действует полный «крест»:
    /// каждый из Items оценивает каждого из Targets.
    /// </summary>
    public List<RespondentTemplateLinkDto> Links { get; set; } = new();
}
