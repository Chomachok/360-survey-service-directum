using Directum360Feedback.Domain.Enums;

namespace Directum360Feedback.Application.DTOs;

public class MatrixItemDto
{
    public int Id { get; set; }
    public int EvaluatorId { get; set; }
    public string EvaluatorName { get; set; } = string.Empty;
    public int TargetId { get; set; }
    public string TargetName { get; set; } = string.Empty;
    public AssessmentRole Role { get; set; }
    public string Token { get; set; } = string.Empty;
    public bool Completed { get; set; }
}

public class CreateMatrixItemDto
{
    public int EvaluatorId { get; set; }
    public int TargetId { get; set; }
    public AssessmentRole Role { get; set; }
}