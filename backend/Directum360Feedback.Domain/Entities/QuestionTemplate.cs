using Directum360Feedback.Domain.Enums;

namespace Directum360Feedback.Domain.Entities;

public class QuestionTemplate : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
    public QuestionType Type { get; set; }
    public string? Options { get; set; }
}