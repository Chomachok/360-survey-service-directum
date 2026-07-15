using Directum360Feedback.Domain.Enums;

namespace Directum360Feedback.Domain.Entities;

public class SurveyAssignment : BaseEntity
{
    public int SurveyId { get; set; }
    public Survey Survey { get; set; } = null!;
    public int EvaluatorId { get; set; }
    public Employee Evaluator { get; set; } = null!;
    public int TargetId { get; set; }
    public Employee Target { get; set; } = null!;
    public string Token { get; set; } = Guid.NewGuid().ToString();
    public bool Completed { get; set; }
    public DateTime? CompletedAt { get; set; }
    public ICollection<Answer> Answers { get; set; } = new List<Answer>();
    public bool InviteSent { get; set; }
}