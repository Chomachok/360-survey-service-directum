namespace Survey360.Api.Entities;

public sealed class Template
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public int CreatorId { get; set; }
    
    public User Creator { get; set; } = null!;
    public ICollection<TemplateQuestion> Questions { get; set; } = new List<TemplateQuestion>();
    public ICollection<Survey> Surveys { get; set; } = new List<Survey>();
}