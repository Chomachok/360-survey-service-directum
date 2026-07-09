using Survey360.Api.Enums;

namespace Survey360.Api.Entities;

public sealed class Survey
{
    public int Id { get; set; }
    public int TemplateId { get; set; }
    public string Title { get; set; } = string.Empty;
    public SurveyStatus Status { get; set; } = SurveyStatus.Draft; // Draft, Active, Closed
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }

    public Template Template { get; set; } = null!;
    public ICollection<Assignment> Assignments { get; set; } = new List<Assignment>();
}