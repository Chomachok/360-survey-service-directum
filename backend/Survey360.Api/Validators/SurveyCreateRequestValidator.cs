using FluentValidation;
using Survey360.Api.DTOs.Surveys;

namespace Survey360.Api.Validators;

public class SurveyCreateRequestValidator : AbstractValidator<SurveyCreateRequest>
{
    public SurveyCreateRequestValidator()
    {
        // 1. Заголовок – обязательный, не длиннее 200 символов
        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Заголовок опроса обязателен")
            .MaximumLength(200).WithMessage("Заголовок не должен превышать 200 символов");

        // 2. Описание – необязательное, но если заполнено, не длиннее 500
        RuleFor(x => x.Description)
            .MaximumLength(500).WithMessage("Описание не должно превышать 500 символов");

        // 3. Даты – обязательные, StartDate раньше EndDate
        RuleFor(x => x.StartDate)
            .NotEmpty().WithMessage("Дата начала обязательна")
            .LessThan(x => x.EndDate).WithMessage("Дата начала должна быть раньше даты окончания");

        RuleFor(x => x.EndDate)
            .NotEmpty().WithMessage("Дата окончания обязательна")
            .GreaterThan(x => x.StartDate).WithMessage("Дата окончания должна быть позже даты начала");

        // 4. StartDate не может быть в прошлом (сегодня или позже)
        RuleFor(x => x.StartDate)
            .GreaterThanOrEqualTo(DateTime.UtcNow.Date)
            .WithMessage("Дата начала не может быть раньше сегодняшнего дня");

        // 5. Логика: если TemplateId не указан, то должны быть свои вопросы
        When(x => x.TemplateId == null, () =>
        {
            RuleFor(x => x.CustomQuestions)
                .NotNull().WithMessage("Если шаблон не выбран, необходимо указать свои вопросы")
                .NotEmpty().WithMessage("Добавьте хотя бы один собственный вопрос");
        });

        // 6. Валидация каждого вопроса из списка CustomQuestions (если они есть)
        When(x => x.CustomQuestions != null && x.CustomQuestions.Any(), () =>
        {
            RuleForEach(x => x.CustomQuestions)
                .ChildRules(question =>
                {
                    question.RuleFor(q => q.Text)
                        .NotEmpty().WithMessage("Текст вопроса обязателен")
                        .MaximumLength(500).WithMessage("Текст вопроса не должен превышать 500 символов");
                });
        });
    }
}