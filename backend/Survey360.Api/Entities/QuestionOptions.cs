namespace Survey360.Api.Entities;

public sealed class QuestionOption
{
    public int Id { get; set; }
    public int QuestionId { get; set; }
    public string Text { get; set; } = string.Empty;
    
    public TemplateQuestion Question { get; set; } = null!;
}