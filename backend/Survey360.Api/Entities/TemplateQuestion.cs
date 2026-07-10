using Survey360.Api.Enums;

namespace Survey360.Api.Entities;

public class TemplateQuestion
{
    public int Id { get; set; }
    public string Text { get; set; } = string.Empty;
    public QuestionType Type { get; set; }
    public int TemplateId { get; set; }
    public Template Template { get; set; } = null!;

    public ICollection<QuestionOption> Options { get; set; } = new List<QuestionOption>();
}