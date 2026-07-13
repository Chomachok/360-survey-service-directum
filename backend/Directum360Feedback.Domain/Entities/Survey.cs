using Directum360Feedback.Domain.Enums;

namespace Directum360Feedback.Domain.Entities;

public class Survey : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public SurveyStatus Status { get; set; } = SurveyStatus.Draft;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public int AuthorId { get; set; }
    public Employee Author { get; set; } = null!;
    public int? TargetId { get; set; }
    public Employee? Target { get; set; }
    public ICollection<SurveyQuestion> Questions { get; set; } = new List<SurveyQuestion>();
    public ICollection<SurveyAssignment> Assignments { get; set; } = new List<SurveyAssignment>();
}