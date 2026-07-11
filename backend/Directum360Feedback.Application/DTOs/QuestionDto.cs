using Directum360Feedback.Domain.Enums;

namespace Directum360Feedback.Application.DTOs;

public class QuestionDto
{
    public int Id { get; set; }
    public string Text { get; set; } = string.Empty;
    public QuestionType Type { get; set; }
    public bool Required { get; set; }
    public int Order { get; set; }
    public List<string>? Options { get; set; }
}

public class CreateQuestionDto
{
    public string Text { get; set; } = string.Empty;
    public QuestionType Type { get; set; }
    public bool Required { get; set; }
    public int Order { get; set; }
    public List<string>? Options { get; set; }
}

public class QuestionTemplateDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
    public QuestionType Type { get; set; }
    public List<string>? Options { get; set; }
}

public class CreateQuestionTemplateDto
{
    public string Name { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
    public QuestionType Type { get; set; }
    public List<string>? Options { get; set; }
}