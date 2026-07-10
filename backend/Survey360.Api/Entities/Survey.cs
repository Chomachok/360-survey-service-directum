using Survey360.Api.Enums;

namespace Survey360.Api.Entities;

public class Survey
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public int? TemplateId { get; set; }
    public Template? Template { get; set; }
    public SurveyStatus Status { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }

    public ICollection<Assignment> Assignments { get; set; } = new List<Assignment>();
}