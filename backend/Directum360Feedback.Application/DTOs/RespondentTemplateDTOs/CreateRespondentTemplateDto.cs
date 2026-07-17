using Directum360Feedback.Application.DTOs.RespondentTemplateDTOs;

namespace Directum360Feedback.Application.DTOs;

public class CreateRespondentTemplateDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public List<CreateRespondentTemplateItemDto> Items { get; set; } = new();
    /// <summary>
    /// Необязательно. Если указать — шаблон будет «привязан» сразу к этим оцениваемым,
    /// и его применение создаст связи для каждого из них.
    /// </summary>
    public List<int> TargetEmployeeIds { get; set; } = new();
    /// <summary>
    /// Необязательно. Явные связи «кто кого оценивает» из Items/TargetEmployeeIds.
    /// Пусто — каждый из Items оценивает каждого из TargetEmployeeIds (старое поведение).
    /// </summary>
    public List<RespondentTemplateLinkDto> Links { get; set; } = new();
}
