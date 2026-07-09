namespace Survey360.Api.Entities;

public sealed class Answer
{
    public int Id { get; set; }
    public int AssignmentId { get; set; }
    public int QuestionId { get; set; } // ID вопроса из шаблона
    public string Text { get; set; } = string.Empty;

    public required Assignment Assignment { get; set; }
}