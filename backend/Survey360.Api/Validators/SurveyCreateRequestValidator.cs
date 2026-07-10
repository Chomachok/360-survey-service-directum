using FluentValidation;
using Survey360.Api.DTOs.Surveys;

namespace Survey360.Api.Validators;

public class SurveyCreateRequestValidator : AbstractValidator<SurveyCreateRequest>
{
    public SurveyCreateRequestValidator()
    {
        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Название опроса обязательно")
            .MaximumLength(200).WithMessage("Название не должно превышать 200 символов");

        RuleFor(x => x.StartDate)
            .NotEmpty().WithMessage("Дата начала обязательна");

        RuleFor(x => x.EndDate)
            .NotEmpty().WithMessage("Дата окончания обязательна")
            .GreaterThan(x => x.StartDate).WithMessage("Дата окончания должна быть позже даты начала");

        When(x => x.TemplateId == null, () =>
        {
            RuleFor(x => x.CustomQuestions)
                .NotNull().WithMessage("Необходимо указать вопросы")
                .NotEmpty().WithMessage("Добавьте хотя бы один вопрос");
        });

        When(x => x.CustomQuestions != null, () =>
        {
            RuleForEach(x => x.CustomQuestions)
                .ChildRules(question =>
                {
                    question.RuleFor(q => q.Text)
                        .NotEmpty().WithMessage("Текст вопроса обязателен")
                        .MaximumLength(500).WithMessage("Текст вопроса не должен превышать 500 символов");

                    question.RuleFor(q => q.Type)
                        .IsInEnum().WithMessage("Некорректный тип вопроса");
                });
        });
    }
}