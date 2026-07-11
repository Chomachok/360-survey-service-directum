using Directum360Feedback.Domain.Enums;

namespace Directum360Feedback.Application.DTOs;

public class CreateMatrixItemDto
{
    public int EvaluatorId { get; set; }
    public int TargetId { get; set; }
    public AssessmentRole Role { get; set; }
}