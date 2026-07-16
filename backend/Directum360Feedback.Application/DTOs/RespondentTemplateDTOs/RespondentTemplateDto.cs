namespace Directum360Feedback.Application.DTOs.RespondentTemplateDTOs;

public class RespondentTemplateDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public List<RespondentTemplateItemDto> Items { get; set; } = new();
}
