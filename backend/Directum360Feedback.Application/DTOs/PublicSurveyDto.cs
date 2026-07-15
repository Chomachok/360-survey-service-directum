using Directum360Feedback.Domain.Enums;

namespace Directum360Feedback.Application.DTOs;

public class PublicSurveyDto
{
    public int SurveyId { get; set; }
    public string SurveyTitle { get; set; } = string.Empty;
    public string TargetName { get; set; } = string.Empty;
    public List<PublicQuestionDto> Questions { get; set; } = new();
}

public class PublicQuestionDto
{
    public int Id { get; set; }
    public string Text { get; set; } = string.Empty;
    public QuestionType Type { get; set; }
    public bool Required { get; set; }
    public List<string>? Options { get; set; }
}

public class SubmitAnswersDto
{
    public List<AnswerDto> Answers { get; set; } = new();
}

public class AnswerDto
{
    public int QuestionId { get; set; }
    public string? TextAnswer { get; set; }
    public string? SelectedOption { get; set; }
}