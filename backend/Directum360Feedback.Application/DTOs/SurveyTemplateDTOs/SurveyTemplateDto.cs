namespace Directum360Feedback.Application.DTOs.SurveyTemplateDTOs;

public class SurveyTemplateDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public List<TemplateQuestionDto> Questions { get; set; } = new();
}