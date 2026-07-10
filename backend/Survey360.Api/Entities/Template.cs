namespace Survey360.Api.Entities;

public class Template
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public int CreatorId { get; set; }
    public User? Creator { get; set; }

    public ICollection<TemplateQuestion> Questions { get; set; } = new List<TemplateQuestion>();
    public ICollection<Survey> Surveys { get; set; } = new List<Survey>();
}