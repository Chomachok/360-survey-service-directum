using FluentValidation;
using Survey360.Api.DTOs.Surveys;
using Survey360.Api.Enums;

namespace Survey360.Api.Validators;

public class UpdateSurveyStatusRequestValidator : AbstractValidator<UpdateSurveyStatusRequest>
{
    public UpdateSurveyStatusRequestValidator()
    {
        RuleFor(x => x.SurveyId).GreaterThan(0);
        RuleFor(x => x.Status).NotEmpty().Must(BeValidStatus);
    }
    private bool BeValidStatus(string status) => Enum.TryParse<SurveyStatus>(status, true, out _);
}