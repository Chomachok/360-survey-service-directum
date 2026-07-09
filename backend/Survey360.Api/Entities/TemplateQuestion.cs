using Survey360.Api.Enums;

namespace Survey360.Api.Entities;

public sealed class TemplateQuestion
{
    public int Id { get; set; }
    public int TemplateId { get; set; }
    public string Text { get; set; } = string.Empty;
    public QuestionType Type { get; set; } // Добавили поле!

    public Template Template { get; set; } = null!;
    // Коллекция для вариантов ответа
    public ICollection<QuestionOption> Options { get; set; } = new List<QuestionOption>();
}