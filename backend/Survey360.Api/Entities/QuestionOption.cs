namespace Survey360.Api.Entities;

public class QuestionOption
{
    public int Id { get; set; }
    public string Text { get; set; } = string.Empty;
    public int TemplateQuestionId { get; set; }
    public TemplateQuestion TemplateQuestion { get; set; } = null!;
}