namespace Directum360Feedback.Application.DTOs.SurveyTemplateDTOs;

public class CreateSurveyTemplateDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public List<CreateTemplateQuestionDto> Questions { get; set; } = new();
}