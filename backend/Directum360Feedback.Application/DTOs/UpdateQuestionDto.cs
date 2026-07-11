using Directum360Feedback.Domain.Enums;

namespace Directum360Feedback.Application.DTOs;

public class UpdateQuestionDto
{
    public string Text { get; set; } = string.Empty;
    public QuestionType Type { get; set; }
    public bool Required { get; set; }
    public List<string>? Options { get; set; }
}