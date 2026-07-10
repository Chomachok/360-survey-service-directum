namespace Survey360.Api.Entities;

public class Question
{
    public int Id { get; set; }
    public string Text { get; set; } = string.Empty;
    // другие поля
    public int TemplateId { get; set; }
    public Template Template { get; set; }
}