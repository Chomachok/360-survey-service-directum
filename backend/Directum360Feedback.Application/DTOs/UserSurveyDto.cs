namespace Directum360Feedback.Application.DTOs;

public class UserSurveyDto
{
    public int SurveyId { get; set; }
    public string SurveyTitle { get; set; } = string.Empty;
    public string TargetName { get; set; } = string.Empty;
    public string Token { get; set; } = string.Empty;
    public bool Completed { get; set; }
}