using Microsoft.EntityFrameworkCore;
using Survey360.Api.Data;
using Survey360.Api.DTOs.Surveys;
using Survey360.Api.DTOs.Templates;
using Survey360.Api.DTOs.Assignments;
using Survey360.Api.DTOs.Answers;
using Survey360.Api.Entities;
using Survey360.Api.Enums;
using Survey360.Api.Interfaces;

namespace Survey360.Api.Services;

public class SurveysService(AppDbContext context) : ISurveysService
{
    // ========== ОПРОСЫ ==========

    public async Task<IEnumerable<SurveySummaryResponse>> GetAllSurveysAsync()
    {
        return await context.Surveys
            .Include(s => s.Assignments)
            .Select(s => new SurveySummaryResponse(
                s.Id,
                s.Title,
                s.Status,
                s.Assignments.Count,
                s.Assignments.Count(a => a.Status == AssignmentStatus.Completed)
            ))
            .ToListAsync();
    }

    public async Task<SurveyResponse?> GetSurveyByIdAsync(int id)
    {
        var survey = await context.Surveys.FindAsync(id);

        if (survey == null)
        {
            return null;
        }

        return new SurveyResponse(
            survey.Id,
            survey.Title,
            survey.Status,
            survey.StartDate,
            survey.EndDate,
            survey.TemplateId
        );
    }

    public async Task<SurveyResponse> CreateSurveyAsync(SurveyCreateRequest request)
    {
        // Вариант 1: Создание из готового шаблона
        if (request.TemplateId.HasValue)
        {
            var template = await context.Templates.FindAsync(request.TemplateId.Value);

            if (template == null)
            {
                throw new KeyNotFoundException($"Шаблон с ID {request.TemplateId} не найден");
            }

            var survey = new Survey
            {
                Title = request.Title,
                TemplateId = template.Id,
                Status = SurveyStatus.Draft,
                StartDate = request.StartDate,
                EndDate = request.EndDate
            };

            context.Surveys.Add(survey);
            await context.SaveChangesAsync();

            return new SurveyResponse(
                survey.Id,
                survey.Title,
                survey.Status,
                survey.StartDate,
                survey.EndDate,
                survey.TemplateId
            );
        }

        // Вариант 2: Создание с кастомными вопросами (создаём временный шаблон)
        if (request.CustomQuestions != null && request.CustomQuestions.Any())
        {
            var template = new Template
            {
                Title = $"Template for: {request.Title}",
                CreatorId = 1, // TODO: получить из контекста авторизации
                Questions = request.CustomQuestions.Select(q => new TemplateQuestion
                {
                    Text = q.Text,
                    Type = q.Type,
                    Options = q.Options?.Select(opt => new QuestionOption
                    {
                        Text = opt
                    }).ToList() ?? new List<QuestionOption>()
                }).ToList()
            };

            context.Templates.Add(template);
            await context.SaveChangesAsync();

            var survey = new Survey
            {
                Title = request.Title,
                TemplateId = template.Id,
                Status = SurveyStatus.Draft,
                StartDate = request.StartDate,
                EndDate = request.EndDate
            };

            context.Surveys.Add(survey);
            await context.SaveChangesAsync();

            return new SurveyResponse(
                survey.Id,
                survey.Title,
                survey.Status,
                survey.StartDate,
                survey.EndDate,
                survey.TemplateId
            );
        }

        throw new ArgumentException("Необходимо указать либо TemplateId, либо CustomQuestions");
    }

    public async Task<bool> ChangeSurveyStatusAsync(int id, SurveyStatus newStatus)
    {
        var survey = await context.Surveys.FindAsync(id);

        if (survey == null)
        {
            return false;
        }

        // Валидация: нельзя активировать опрос без назначений (раздел 5.2 ТЗ)
        if (newStatus == SurveyStatus.Active)
        {
            var hasAssignments = await context.Assignments
                .AnyAsync(a => a.SurveyId == id);

            if (!hasAssignments)
            {
                throw new InvalidOperationException("Нельзя активировать опрос без назначений респондентов");
            }

            // Проверяем, что есть хотя бы один вопрос в шаблоне
            var surveyWithTemplate = await context.Surveys
                .Include(s => s.Template)
                .ThenInclude(t => t!.Questions)
                .FirstOrDefaultAsync(s => s.Id == id);

            if (surveyWithTemplate?.Template?.Questions == null || 
                !surveyWithTemplate.Template.Questions.Any())
            {
                throw new InvalidOperationException("Нельзя активировать опрос без вопросов");
            }
        }

        // Валидация: нельзя редактировать завершённый опрос
        if (survey.Status == SurveyStatus.Closed)
        {
            throw new InvalidOperationException("Нельзя изменить статус завершённого опроса");
        }

        survey.Status = newStatus;

        // При завершении автоматически проставляем дату окончания
        if (newStatus == SurveyStatus.Closed && survey.EndDate == null)
        {
            survey.EndDate = DateTime.UtcNow;
        }

        await context.SaveChangesAsync();

        return true;
    }

    public async Task<bool> DeleteSurveyAsync(int id)
    {
        var survey = await context.Surveys
            .Include(s => s.Assignments)
            .ThenInclude(a => a.Answers)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (survey == null)
        {
            return false;
        }

        // Нельзя удалить активный опрос
        if (survey.Status == SurveyStatus.Active)
        {
            throw new InvalidOperationException("Нельзя удалить активный опрос");
        }

        context.Surveys.Remove(survey);
        await context.SaveChangesAsync();

        return true;
    }

    // ========== ВОПРОСЫ ОПРОСА ==========

    public async Task<IEnumerable<TemplateQuestionDto>> GetSurveyQuestionsAsync(int surveyId)
    {
        var survey = await context.Surveys
            .Include(s => s.Template)
            .ThenInclude(t => t!.Questions)
            .FirstOrDefaultAsync(s => s.Id == surveyId);

        if (survey?.Template == null)
        {
            return Enumerable.Empty<TemplateQuestionDto>();
        }

        return survey.Template.Questions
            .Select(q => new TemplateQuestionDto(q.Id, q.Text))
            .ToList();
    }

    // ========== МАТРИЦА ОПРАШИВАЕМЫХ (раздел 5.2 ТЗ) ==========

    public async Task<AssignmentResponse> CreateAssignmentAsync(AssignmentCreateRequest request)
    {
        var survey = await context.Surveys.FindAsync(request.SurveyId);
        if (survey == null)
        {
            throw new KeyNotFoundException($"Опрос с ID {request.SurveyId} не найден");
        }

        // Нельзя редактировать матрицу активного/завершённого опроса
        if (survey.Status != SurveyStatus.Draft)
        {
            throw new InvalidOperationException("Нельзя редактировать матрицу после запуска опроса");
        }

        var evaluator = await context.Users.FindAsync(request.EvaluatorId);
        if (evaluator == null)
        {
            throw new KeyNotFoundException($"Респондент с ID {request.EvaluatorId} не найден");
        }

        var evaluatee = await context.Users.FindAsync(request.EvaluateeId);
        if (evaluatee == null)
        {
            throw new KeyNotFoundException($"Оцениваемый с ID {request.EvaluateeId} не найден");
        }

        // Проверяем, что такое назначение уже не существует
        var existing = await context.Assignments
            .AnyAsync(a => a.SurveyId == request.SurveyId
                        && a.EvaluatorId == request.EvaluatorId
                        && a.EvaluateeId == request.EvaluateeId);

        if (existing)
        {
            throw new InvalidOperationException("Такое назначение уже существует");
        }

        var assignment = new Assignment
        {
            SurveyId = request.SurveyId,
            EvaluatorId = request.EvaluatorId,
            EvaluateeId = request.EvaluateeId,
            Status = AssignmentStatus.Pending,
            Survey = survey,
            Evaluator = evaluator,
            Evaluatee = evaluatee
        };

        context.Assignments.Add(assignment);
        await context.SaveChangesAsync();

        return new AssignmentResponse(
            assignment.Id,
            assignment.SurveyId,
            evaluator.FullName,
            evaluatee.FullName,
            assignment.Status.ToString()
        );
    }

    public async Task<IEnumerable<AssignmentResponse>> GetSurveyAssignmentsAsync(int surveyId)
    {
        return await context.Assignments
            .Where(a => a.SurveyId == surveyId)
            .Include(a => a.Evaluator)
            .Include(a => a.Evaluatee)
            .Select(a => new AssignmentResponse(
                a.Id,
                a.SurveyId,
                a.Evaluator.FullName,
                a.Evaluatee.FullName,
                a.Status.ToString()
            ))
            .ToListAsync();
    }

    public async Task<bool> DeleteAssignmentAsync(int assignmentId)
    {
        var assignment = await context.Assignments.FindAsync(assignmentId);

        if (assignment == null)
        {
            return false;
        }

        // Нельзя удалить назначение активного опроса
        var survey = await context.Surveys.FindAsync(assignment.SurveyId);
        if (survey?.Status != SurveyStatus.Draft)
        {
            throw new InvalidOperationException("Нельзя удалить назначение после запуска опроса");
        }

        context.Assignments.Remove(assignment);
        await context.SaveChangesAsync();

        return true;
    }

    // ========== ПРОХОЖДЕНИЕ ОПРОСА (раздел 5.4 ТЗ) ==========

    public async Task<AnswerResponse> SubmitAnswerAsync(AnswerSubmitRequest request)
    {
        // 1. Загружаем назначение с опросом, шаблоном и вопросами
        var assignment = await context.Assignments
            .Include(a => a.Survey)
                .ThenInclude(s => s.Template)
                    .ThenInclude(t => t.Questions)
            .FirstOrDefaultAsync(a => a.Id == request.AssignmentId);

        if (assignment is null)
            throw new KeyNotFoundException($"Назначение с ID {request.AssignmentId} не найдено");

        // 2. Проверка статуса опроса
        if (assignment.Survey.Status != SurveyStatus.Active)
            throw new InvalidOperationException("Опрос не активен");

        // 3. Проверка статуса назначения
        if (assignment.Status == AssignmentStatus.Completed)
            throw new InvalidOperationException("Эта анкета уже отправлена");

        // 4. Проверка существования вопроса в шаблоне
        var question = assignment.Survey.Template?.Questions
            .FirstOrDefault(q => q.Id == request.QuestionId);

        if (question is null)
            throw new KeyNotFoundException($"Вопрос с ID {request.QuestionId} не найден в этом опросе");

        // 5. Базовая валидация текста (можно вынести во FluentValidation)
        if (string.IsNullOrWhiteSpace(request.Text))
            throw new ArgumentException("Ответ не может быть пустым");

        // 6. Проверка, не отвечал ли уже пользователь на этот вопрос
        var existingAnswer = await context.Answers
            .FirstOrDefaultAsync(a => a.AssignmentId == request.AssignmentId
                                   && a.QuestionId == request.QuestionId);

        if (existingAnswer is not null)
        {
            // Обновляем существующий ответ
            existingAnswer.Text = request.Text;
        }
        else
        {
            // Создаём новый ответ (обратите внимание: AssignmentId задаётся, а навигация не требуется,
            // если она не помечена как required)
            var answer = new Answer
            {
                AssignmentId = request.AssignmentId,
                QuestionId = request.QuestionId,
                Text = request.Text
            };
            context.Answers.Add(answer);
        }

        await context.SaveChangesAsync();

        return new AnswerResponse(question.Text, request.Text);
    }

    public async Task<IEnumerable<AnswerResponse>> GetRespondentAnswersAsync(int assignmentId)
    {
        var answers = await context.Answers
            .Where(a => a.AssignmentId == assignmentId)
            .ToListAsync();

        var result = new List<AnswerResponse>();

        foreach (var answer in answers)
        {
            var question = await context.Set<TemplateQuestion>().FindAsync(answer.QuestionId);
            if (question != null)
            {
                result.Add(new AnswerResponse(question.Text, answer.Text));
            }
        }

        return result;
    }

    // ========== РЕЗУЛЬТАТЫ (раздел 5.5 ТЗ) ==========

    public async Task<IEnumerable<AnswerResponse>> GetSurveyResultsAsync(int surveyId, int evaluateeId)
    {
        var assignments = await context.Assignments
            .Where(a => a.SurveyId == surveyId && a.EvaluateeId == evaluateeId)
            .Include(a => a.Answers)
            .ToListAsync();

        var results = new List<AnswerResponse>();

        foreach (var assignment in assignments)
        {
            foreach (var answer in assignment.Answers)
            {
                var question = await context.Set<TemplateQuestion>().FindAsync(answer.QuestionId);
                if (question != null)
                {
                    results.Add(new AnswerResponse(question.Text, answer.Text));
                }
            }
        }

        return results;
    }
}