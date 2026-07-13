namespace Directum360Feedback.Application.DTOs;

/// <summary>Сохранить уже набранный вручную список респондентов как шаблон</summary>
public class CreateTemplateFromSurveyDto
{
    public int SurveyId { get; set; }
    public int TargetId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
}
