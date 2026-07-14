namespace Directum360Feedback.Application.DTOs;

/// <summary>
/// Сохранить уже набранный вручную список респондентов опроса как шаблон.
/// Оцениваемый берётся из самого опроса (Survey.TargetId).
/// </summary>
public class CreateTemplateFromSurveyDto
{
    public int SurveyId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
}
