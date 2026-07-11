namespace Directum360Feedback.Domain.Entities;

public class Employee : BaseEntity
{
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public ICollection<Survey> AuthoredSurveys { get; set; } = new List<Survey>();
    public ICollection<SurveyAssignment> AssignmentsAsEvaluator { get; set; } = new List<SurveyAssignment>();
    public ICollection<SurveyAssignment> AssignmentsAsTarget { get; set; } = new List<SurveyAssignment>();
}