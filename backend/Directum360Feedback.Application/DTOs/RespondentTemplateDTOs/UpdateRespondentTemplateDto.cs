using Directum360Feedback.Application.DTOs.RespondentTemplateDTOs;

namespace Directum360Feedback.Application.DTOs;

public class UpdateRespondentTemplateDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public List<CreateRespondentTemplateItemDto> Items { get; set; } = new();
    /// <summary>Необязательно. Пусто — шаблон снова становится универсальным.</summary>
    public List<int> TargetEmployeeIds { get; set; } = new();
}
