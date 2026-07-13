using Directum360Feedback.Domain.Enums;

namespace Directum360Feedback.Application.DTOs.SurveyTemplateDTOs;

public class TemplateQuestionDto
{
    public int Id { get; set; }
    public string Text { get; set; } = string.Empty;
    public QuestionType Type { get; set; }
    public bool Required { get; set; }
    public int Order { get; set; }
    public List<string>? Options { get; set; }
}