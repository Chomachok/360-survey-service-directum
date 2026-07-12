namespace Directum360Feedback.Application.DTOs.ResultDTOs;

public class QuestionAnswerDto
{
    public string QuestionText { get; set; } = string.Empty;
    public string? AnswerText { get; set; }
    public string? SelectedOption { get; set; }
}