namespace Directum360Feedback.Domain.Entities;

public class Answer : BaseEntity
{
    public int AssignmentId { get; set; }
    public SurveyAssignment Assignment { get; set; } = null!;
    public int QuestionId { get; set; }
    public SurveyQuestion Question { get; set; } = null!;
    public string? TextAnswer { get; set; }
    public string? SelectedOption { get; set; }
}