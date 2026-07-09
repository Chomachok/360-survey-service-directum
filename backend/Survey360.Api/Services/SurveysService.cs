using Microsoft.EntityFrameworkCore;
using Survey360.Api.Data;
using Survey360.Api.DTOs.Surveys;
using Survey360.Api.DTOs.Templates;
using Survey360.Api.DTOs.Assignments;
using Survey360.Api.DTOs.Answers;
using Survey360.Api.Entities;
using Survey360.Api.Enums;

namespace Survey360.Api.Services;

public class SurveysService
{
    private readonly AppDbContext _context;

    public SurveysService(AppDbContext context)
    {
        _context = context;
    }

    // ========== СОЗДАНИЕ ОПРОСА ==========

    public async Task<SurveyResponse> CreateSurveyAsync(SurveyCreateRequest request)
    {
        // Если указан TemplateId — используем готовый шаблон
        if (request.TemplateId.HasValue)
        {
            var template = await _context.Templates
                .Include(t => t.Questions)
                .ThenInclude(q => q.Options)
                .FirstOrDefaultAsync(t => t.Id == request.TemplateId.Value);

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

            _context.Surveys.Add(survey);
            await _context.SaveChangesAsync();

            return new SurveyResponse(
                survey.Id,
                survey.Title,
                survey.Status,
                survey.StartDate,
                survey.EndDate,
                survey.TemplateId
            );
        }

        // Если указаны CustomQuestions — создаём опрос с кастомными вопросами
        if (request.CustomQuestions != null && request.CustomQuestions.Any())
        {
            // Создаём временный шаблон для кастомных вопросов
            var template = new Template
            {
                Title = $"Template for: {request.Title}",
                CreatorId = 1, // TODO: получить из контекста авторизации
                Questions = request.CustomQuestions.Select(q => new TemplateQuestion
                {
                    Text = q.Text,
                    Type = q.Type,
                    Options = q.Options?.Select((opt, idx) => new QuestionOption
                    {
                        Text = opt,
                    }).ToList() ?? new List<QuestionOption>()
                }).ToList()
            };

            _context.Templates.Add(template);
            await _context.SaveChangesAsync();

            var survey = new Survey
            {
                Title = request.Title,
                TemplateId = template.Id,
                Status = SurveyStatus.Draft,
                StartDate = request.StartDate,
                EndDate = request.EndDate
            };

            _context.Surveys.Add(survey);
            await _context.SaveChangesAsync();

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

    // ========== ПОЛУЧЕНИЕ СПИСКА ОПРОСОВ ==========

    public async Task<IEnumerable<SurveySummaryResponse>> GetAllSurveysAsync()
    {
        return await _context.Surveys
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

    // ========== ПОЛУЧЕНИЕ ОПРОСА ПО ID ==========

    public async Task<SurveyResponse?> GetSurveyByIdAsync(int id)
    {
        var survey = await _context.Surveys
            .FirstOrDefaultAsync(s => s.Id == id);

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

    // ========== ИЗМЕНЕНИЕ СТАТУСА ОПРОСА ==========

    public async Task<bool> ChangeSurveyStatusAsync(int id, SurveyStatus newStatus)
    {
        var survey = await _context.Surveys.FindAsync(id);

        if (survey == null)
        {
            return false;
        }

        // Валидация: нельзя активировать опрос без назначений
        if (newStatus == SurveyStatus.Active)
        {
            var hasAssignments = await _context.Assignments
                .AnyAsync(a => a.SurveyId == id);

            if (!hasAssignments)
            {
                throw new InvalidOperationException("Нельзя активировать опрос без назначений респондентов");
            }
        }

        survey.Status = newStatus;
        await _context.SaveChangesAsync();

        return true;
    }

    // ========== УДАЛЕНИЕ ОПРОСА ==========

    public async Task<bool> DeleteSurveyAsync(int id)
    {
        var survey = await _context.Surveys
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

        _context.Surveys.Remove(survey);
        await _context.SaveChangesAsync();

        return true;
    }

    // ========== ПОЛУЧЕНИЕ ВОПРОСОВ ОПРОСА ==========

    public async Task<IEnumerable<TemplateQuestionDto>> GetSurveyQuestionsAsync(int surveyId)
    {
        var survey = await _context.Surveys
            .Include(s => s.Template)
            .ThenInclude(t => t.Questions)
            .FirstOrDefaultAsync(s => s.Id == surveyId);

        if (survey?.Template == null)
        {
            return Enumerable.Empty<TemplateQuestionDto>();
        }

        return survey.Template.Questions
            .Select(q => new TemplateQuestionDto(q.Id, q.Text))
            .ToList();
    }

    // ========== ДОБАВЛЕНИЕ НАЗНАЧЕНИЯ (МАТРИЦА) ==========

    public async Task<AssignmentResponse> CreateAssignmentAsync(AssignmentCreateRequest request)
    {
        var survey = await _context.Surveys.FindAsync(request.SurveyId);
        if (survey == null)
        {
            throw new KeyNotFoundException($"Опрос с ID {request.SurveyId} не найден");
        }

        var evaluator = await _context.Users.FindAsync(request.EvaluatorId);
        if (evaluator == null)
        {
            throw new KeyNotFoundException($"Оценивающий с ID {request.EvaluatorId} не найден");
        }

        var evaluatee = await _context.Users.FindAsync(request.EvaluateeId);
        if (evaluatee == null)
        {
            throw new KeyNotFoundException($"Оцениваемый с ID {request.EvaluateeId} не найден");
        }

        // Проверяем, что такое назначение уже не существует
        var existing = await _context.Assignments
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

        _context.Assignments.Add(assignment);
        await _context.SaveChangesAsync();

        return new AssignmentResponse(
            assignment.Id,
            assignment.SurveyId,
            evaluator.Name,
            evaluatee.Name,
            assignment.Status.ToString()
        );
    }

    // ========== ПОЛУЧЕНИЕ НАЗНАЧЕНИЙ ОПРОСА ==========

    public async Task<IEnumerable<AssignmentResponse>> GetSurveyAssignmentsAsync(int surveyId)
    {
        return await _context.Assignments
            .Where(a => a.SurveyId == surveyId)
            .Include(a => a.Evaluator)
            .Include(a => a.Evaluatee)
            .Select(a => new AssignmentResponse(
                a.Id,
                a.SurveyId,
                a.Evaluator.Name,
                a.Evaluatee.Name,
                a.Status.ToString()
            ))
            .ToListAsync();
    }

    // ========== ОТПРАВКА ОТВЕТА ==========

    public async Task<AnswerResponse> SubmitAnswerAsync(AnswerSubmitRequest request)
    {
        var assignment = await _context.Assignments
            .Include(a => a.Survey)
            .ThenInclude(s => s.Template)
            .ThenInclude(t => t.Questions)
            .FirstOrDefaultAsync(a => a.Id == request.AssignmentId);

        if (assignment == null)
        {
            throw new KeyNotFoundException($"Назначение с ID {request.AssignmentId} не найден");
        }

        // Проверяем, что опрос активен
        if (assignment.Survey.Status != SurveyStatus.Active)
        {
            throw new InvalidOperationException("Опрос не активен");
        }

        // Проверяем, что вопрос существует в шаблоне
        var questionExists = assignment.Survey.Template.Questions
            .Any(q => q.Id == request.QuestionId);

        if (!questionExists)
        {
            throw new KeyNotFoundException($"Вопрос с ID {request.QuestionId} не найден в этом опросе");
        }

        // Проверяем, не отвечал ли уже респондент на этот вопрос
        var existingAnswer = await _context.Answers
            .FirstOrDefaultAsync(a => a.AssignmentId == request.AssignmentId 
                                   && a.QuestionId == request.QuestionId);

        if (existingAnswer != null)
        {
            // Обновляем существующий ответ
            existingAnswer.Text = request.Text;
        }
        else
        {
            // Создаём новый ответ
            var answer = new Answer
            {
                AssignmentId = request.AssignmentId,
                QuestionId = request.QuestionId,
                Text = request.Text
            };

            _context.Answers.Add(answer);
        }

        // Проверяем, все ли обязательные вопросы отвечены
        var totalQuestions = assignment.Survey.Template.Questions.Count;
        var answeredQuestions = await _context.Answers
            .CountAsync(a => a.AssignmentId == request.AssignmentId);

        if (answeredQuestions >= totalQuestions)
        {
            assignment.Status = AssignmentStatus.Completed;
        }

        await _context.SaveChangesAsync();

        var question = assignment.Survey.Template.Questions.First(q => q.Id == request.QuestionId);

        return new AnswerResponse(question.Text, request.Text);
    }

    // ========== ПОЛУЧЕНИЕ РЕЗУЛЬТАТОВ ОПРОСА ==========

    public async Task<IEnumerable<AnswerResponse>> GetSurveyResultsAsync(int surveyId, int evaluateeId)
    {
        var assignments = await _context.Assignments
            .Where(a => a.SurveyId == surveyId && a.EvaluateeId == evaluateeId)
            .Include(a => a.Answers)
            .ThenInclude(ans => _context.Set<TemplateQuestion>().First(q => q.Id == ans.QuestionId))
            .ToListAsync();

        var results = new List<AnswerResponse>();

        foreach (var assignment in assignments)
        {
            foreach (var answer in assignment.Answers)
            {
                var question = await _context.Set<TemplateQuestion>().FindAsync(answer.QuestionId);
                if (question != null)
                {
                    results.Add(new AnswerResponse(question.Text, answer.Text));
                }
            }
        }

        return results;
    }
}