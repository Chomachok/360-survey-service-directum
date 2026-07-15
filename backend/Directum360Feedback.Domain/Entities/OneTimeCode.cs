namespace Directum360Feedback.Domain.Entities;

public class OneTimeCode : BaseEntity
{
    public string Email { get; set; } = string.Empty; 
    public string Code { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public bool IsUsed { get; set; } = false;
}