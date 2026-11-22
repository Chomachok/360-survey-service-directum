using Directum360Feedback.Application.DTOs.EmployeeDTOs;
using FluentValidation;

namespace Directum360Feedback.Application.Validators;

public class EmployeeImportDtoValidator : AbstractValidator<EmployeeImportDto>
{
    public EmployeeImportDtoValidator()
    {
        RuleFor(x => x.FullName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(200);
        RuleFor(x => x.Roles).NotEmpty();
    }
}