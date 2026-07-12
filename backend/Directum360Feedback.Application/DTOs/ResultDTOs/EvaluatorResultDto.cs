using Directum360Feedback.Domain.Enums;

namespace Directum360Feedback.Application.DTOs.ResultDTOs;

public class EvaluatorResultDto
{
    public int EvaluatorId { get; set; }
    public string EvaluatorName { get; set; } = string.Empty;
    public AssessmentRole Role { get; set; }
    public List<QuestionAnswerDto> Answers { get; set; } = new();
}