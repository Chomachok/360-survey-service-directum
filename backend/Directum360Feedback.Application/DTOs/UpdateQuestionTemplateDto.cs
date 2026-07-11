using Directum360Feedback.Domain.Enums;

namespace Directum360Feedback.Application.DTOs;

public class UpdateQuestionTemplateDto
{
    public string Name { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
    public QuestionType Type { get; set; }
    public List<string>? Options { get; set; }
}