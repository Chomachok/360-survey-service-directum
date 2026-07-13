namespace Directum360Feedback.Domain.Entities;

public class SurveyTemplate : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public ICollection<SurveyTemplateQuestion> Questions { get; set; } = new List<SurveyTemplateQuestion>();
}