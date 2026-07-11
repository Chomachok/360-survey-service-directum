using FluentValidation;
using Survey360.Api.DTOs.Assignments;

namespace Survey360.Api.Validators;

public class AssignmentCreateRequestValidator : AbstractValidator<AssignmentCreateRequest>
{
    public AssignmentCreateRequestValidator()
    {
        RuleFor(x => x.SurveyId).GreaterThan(0);
        RuleFor(x => x.EvaluatorId).GreaterThan(0);
        RuleFor(x => x.EvaluateeId).GreaterThan(0);
    }
}