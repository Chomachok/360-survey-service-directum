using Directum360Feedback.Domain.Enums;

namespace Directum360Feedback.Domain.Entities;

public class SurveyQuestion : BaseEntity
{
    public int SurveyId { get; set; }
    public Survey Survey { get; set; } = null!;
    public string Text { get; set; } = string.Empty;
    public QuestionType Type { get; set; }
    public bool Required { get; set; }
    public int Order { get; set; }
    public string? Options { get; set; } // JSON array
    public ICollection<Answer> Answers { get; set; } = new List<Answer>();
}