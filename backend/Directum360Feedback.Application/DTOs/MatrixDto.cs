using Directum360Feedback.Domain.Enums;

namespace Directum360Feedback.Application.DTOs;

public class MatrixItemDto
{
    public int Id { get; set; }
    public int EvaluatorId { get; set; }
    public string EvaluatorName { get; set; } = string.Empty;
    public int TargetId { get; set; }
    public string TargetName { get; set; } = string.Empty;
    public string Token { get; set; } = string.Empty;
    public bool Completed { get; set; }
}