using System.ComponentModel.DataAnnotations.Schema;
using Survey360.Api.Enums;

namespace Survey360.Api.Entities;

public sealed class Assignment
{
    public int Id { get; set; }
    public int SurveyId { get; set; }
    public int EvaluatorId { get; set; } // Кто оценивает
    public int EvaluateeId { get; set; } // Кого оценивают
    public AssignmentStatus Status { get; set; } = AssignmentStatus.Pending; // Pending, Completed

    public required Survey Survey { get; set; }

    [ForeignKey(nameof(EvaluatorId))]
    public required User Evaluator { get; set; } 

    [ForeignKey(nameof(EvaluateeId))]
    public required User Evaluatee { get; set; }

    public ICollection<Answer> Answers { get; set; } = new List<Answer>();
}