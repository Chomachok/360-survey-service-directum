using FluentValidation;
using Directum360Feedback.Application.DTOs;

namespace Directum360Feedback.Application.Validators;

public class CreateSurveyDtoValidator : AbstractValidator<CreateSurveyDto>
{
    public CreateSurveyDtoValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(200);
        RuleFor(x => x.EndDate).GreaterThan(x => x.StartDate);
        RuleFor(x => x.AuthorId).GreaterThan(0);
    }
}