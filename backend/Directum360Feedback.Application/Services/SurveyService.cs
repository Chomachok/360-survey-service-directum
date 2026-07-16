using System.Text.Json;
using AutoMapper;
using Directum360Feedback.Application.DTOs;
using Directum360Feedback.Application.DTOs.SurveyTemplateDTOs;
using Directum360Feedback.Application.Interfaces;
using Directum360Feedback.Domain.Entities;
using Directum360Feedback.Domain.Enums;
using Directum360Feedback.Infrastructure.Repositories;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Directum360Feedback.Application.Services;

public class SurveyService(
    IRepository<Survey> surveyRepo,
    IRepository<Employee> employeeRepo,
    IRepository<SurveyQuestion> surveyQuestionRepo,
    IRepository<SurveyTemplate> surveyTemplateRepo,
    IRepository<SurveyTemplateQuestion> templateQuestionRepo,
    IRepository<SurveyAssignment> assignmentRepo,
    IMapper mapper,
    IConfiguration configuration,
    IServiceScopeFactory scopeFactory)
    : ISurveyService
{
    private readonly string _baseUrl = configuration["BaseUrl"] ?? "http://localhost:5173";

    public async Task<SurveyDto> PublishSurveyAsync(int id)
    {
        var survey = await surveyRepo.GetByIdAsync(id);
        if (survey == null)
            throw new Exception("Survey not found");

        if (survey.Status != SurveyStatus.Draft)
            throw new Exception("Only drafts can be published");

        survey.Status = SurveyStatus.Active;
        surveyRepo.Update(survey);
        await surveyRepo.SaveChangesAsync();

        // --- Отправка писем всем назначениям, у которых ещё не отправлено ---
        _ = Task.Run(async () =>
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                var scopedAssignmentRepo = scope.ServiceProvider.GetRequiredService<IRepository<SurveyAssignment>>();
                var scopedEmailService = scope.ServiceProvider.GetRequiredService<IEmailService>();

                var assignments = await scopedAssignmentRepo.FindAsync(
                    a => a.SurveyId == id && !a.InviteSent,
                    a => a.Evaluator,
                    a => a.Target
                );

                int sentCount = 0;
                foreach (var assignment in assignments)
                {
                    try
                    {
                        await scopedEmailService.SendSurveyInviteAsync(assignment, _baseUrl);
                        assignment.InviteSent = true;
                        scopedAssignmentRepo.Update(assignment);
                        sentCount++;
                        await Task.Delay(1000);
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"❌ Ошибка отправки письма для Assignment {assignment.Id}: {ex.Message}");
                    }
                }

                if (sentCount > 0)
                {
                    await scopedAssignmentRepo.SaveChangesAsync();
                    Console.WriteLine($"✅ Отправлено {sentCount} приглашений для опроса {id}");
                }
                else
                {
                    Console.WriteLine($"ℹ️ Нет новых назначений для отправки писем по опросу {id}");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Ошибка при массовой отправке писем: {ex.Message}");
            }
        });

        var dto = mapper.Map<SurveyDto>(survey);
        var author = await employeeRepo.GetByIdAsync(survey.AuthorId);
        dto.AuthorName = author?.FullName ?? "Unknown";
        return dto;
    }

    public async Task<IEnumerable<SurveyDto>> GetAllSurveysAsync(string? status = null, string? search = null)
    {
        var surveys = await surveyRepo.GetAllAsync();
        var query = surveys.AsQueryable();

        if (!string.IsNullOrEmpty(status) && Enum.TryParse<SurveyStatus>(status, true, out var statusEnum))
            query = query.Where(s => s.Status == statusEnum);

        if (!string.IsNullOrEmpty(search))
        {
            var searchLower = search.ToLower();
            query = query.Where(s => s.Title.ToLower().Contains(searchLower));
        }

        var result = new List<SurveyDto>();
        foreach (var survey in query)
        {
            var updatedSurvey = await CheckAndUpdateAsync(survey);
            var dto = mapper.Map<SurveyDto>(updatedSurvey);
            var author = await employeeRepo.GetByIdAsync(updatedSurvey.AuthorId);
            dto.AuthorName = author?.FullName ?? "Unknown";
            result.Add(dto);
        }
        return result;
    }

    public async Task<SurveyDto?> GetSurveyByIdAsync(int id)
    {
        var survey = await surveyRepo.GetByIdAsync(id);
        if (survey == null) return null;
        var updatedSurvey = await CheckAndUpdateAsync(survey);
        var dto = mapper.Map<SurveyDto>(updatedSurvey);
        var author = await employeeRepo.GetByIdAsync(updatedSurvey.AuthorId);
        dto.AuthorName = author?.FullName ?? "Unknown";
        return dto;
    }

    public async Task<SurveyDto> CreateSurveyAsync(CreateSurveyDto dto)
    {
        var survey = mapper.Map<Survey>(dto);
        survey.Status = SurveyStatus.Draft;
        await surveyRepo.AddAsync(survey);
        await surveyRepo.SaveChangesAsync();

        if (dto.TemplateId.HasValue)
        {
            await ApplyTemplateToSurveyAsync(survey.Id, dto.TemplateId.Value);
        }

        var surveyDto = mapper.Map<SurveyDto>(survey);
        var author = await employeeRepo.GetByIdAsync(survey.AuthorId);
        surveyDto.AuthorName = author?.FullName ?? "Unknown";
        return surveyDto;
    }

    public async Task<SurveyDto> UpdateSurveyAsync(int id, UpdateSurveyDto dto)
    {
        var survey = await surveyRepo.GetByIdAsync(id);
        if (survey == null) throw new Exception("Survey not found");
        if (survey.Status != SurveyStatus.Draft)
            throw new Exception("Редактирование доступно только для черновиков");

        mapper.Map(dto, survey);
        surveyRepo.Update(survey);
        await surveyRepo.SaveChangesAsync();
        return mapper.Map<SurveyDto>(survey);
    }

    public async Task DeleteSurveyAsync(int id)
    {
        var survey = await surveyRepo.GetByIdAsync(id);
        if (survey != null)
        {
            surveyRepo.Delete(survey);
            await surveyRepo.SaveChangesAsync();
        }
    }

    public async Task<SurveyDto> CompleteSurveyAsync(int id)
    {
        var survey = await surveyRepo.GetByIdAsync(id);
        if (survey == null) throw new Exception("Survey not found");
        if (survey.Status != SurveyStatus.Active)
            throw new Exception("Only active surveys can be completed");

        survey.Status = SurveyStatus.Completed;
        surveyRepo.Update(survey);
        await surveyRepo.SaveChangesAsync();

        var dto = mapper.Map<SurveyDto>(survey);
        var author = await employeeRepo.GetByIdAsync(survey.AuthorId);
        dto.AuthorName = author?.FullName ?? "Unknown";
        return dto;
    }

    private async Task<Survey> CheckAndUpdateAsync(Survey survey)
    {
        if (survey.Status == SurveyStatus.Active && survey.EndDate.ToUniversalTime() <= DateTime.UtcNow)
        {
            survey.Status = SurveyStatus.Completed;
            surveyRepo.Update(survey);
            await surveyRepo.SaveChangesAsync();
        }

        if (survey.Status == SurveyStatus.Draft && survey.StartDate.ToUniversalTime() <= DateTime.UtcNow)
        {
            survey.Status = SurveyStatus.Active;
            surveyRepo.Update(survey);
            await surveyRepo.SaveChangesAsync();
        }

        return survey;
    }

    public async Task ApplyTemplateToSurveyAsync(int surveyId, int templateId)
    {
        var survey = await surveyRepo.GetByIdAsync(surveyId);
        if (survey == null) throw new Exception("Survey not found");

        var template = await surveyTemplateRepo.GetByIdAsync(templateId);
        if (template == null) throw new Exception("Template not found");

        var templateQuestions = await templateQuestionRepo.FindAsync(q => q.SurveyTemplateId == templateId);

        // Удаляем существующие вопросы опроса
        var existingQuestions = await surveyQuestionRepo.FindAsync(q => q.SurveyId == surveyId);
        foreach (var q in existingQuestions)
            surveyQuestionRepo.Delete(q);
        await surveyQuestionRepo.SaveChangesAsync();

        // Копируем вопросы из шаблона
        foreach (var tq in templateQuestions.OrderBy(q => q.Order))
        {
            var question = new SurveyQuestion
            {
                SurveyId = surveyId,
                Text = tq.Text,
                Type = tq.Type,
                Required = tq.Required,
                Order = tq.Order,
                Options = tq.Options
            };
            await surveyQuestionRepo.AddAsync(question);
        }
        await surveyQuestionRepo.SaveChangesAsync();
    }
    
    public async Task<SurveyTemplateDto> SaveSurveyAsTemplateAsync(int surveyId, string templateName, string? templateDescription)
    {
        var survey = await surveyRepo.GetByIdAsync(surveyId);
        if (survey == null)
            throw new Exception("Опрос не найден");

        var questions = await surveyQuestionRepo.FindAsync(q => q.SurveyId == surveyId);
        if (!questions.Any())
            throw new Exception("В опросе нет вопросов, нечего сохранять");

        // Создаём шаблон
        var template = new SurveyTemplate
        {
            Name = templateName,
            Description = templateDescription,
            CreatedAt = DateTime.UtcNow,
            Questions = new List<SurveyTemplateQuestion>()
        };

        var order = 1;
        foreach (var q in questions.OrderBy(q => q.Order))
        {
            template.Questions.Add(new SurveyTemplateQuestion
            {
                Text = q.Text,
                Type = q.Type,
                Required = q.Required,
                Order = order++,
                Options = q.Options,
                CreatedAt = DateTime.UtcNow
            });
        }

        await surveyTemplateRepo.AddAsync(template);
        await surveyTemplateRepo.SaveChangesAsync();

        // Загружаем созданный шаблон с вопросами для ответа
        var createdTemplate = await surveyTemplateRepo.GetByIdAsync(template.Id);
        var templateQuestions = await templateQuestionRepo.FindAsync(q => q.SurveyTemplateId == template.Id);
        var dto = mapper.Map<SurveyTemplateDto>(createdTemplate);
        dto.Questions = templateQuestions.OrderBy(q => q.Order).Select(q =>
        {
            var qDto = mapper.Map<TemplateQuestionDto>(q);
            if (!string.IsNullOrEmpty(q.Options))
                qDto.Options = JsonSerializer.Deserialize<List<string>>(q.Options);
            return qDto;
        }).ToList();

        return dto;
    }
    
    public async Task<IEnumerable<UserSurveyDto>> GetUserSurveysAsync(int userId)
    {
        var assignments = await assignmentRepo.FindAsync(
            a => a.EvaluatorId == userId && a.Survey.Status == SurveyStatus.Active,
            a => a.Survey,
            a => a.Target
        );

        return assignments.Select(a => new UserSurveyDto
        {
            SurveyId = a.Survey.Id,
            SurveyTitle = a.Survey.Title,
            TargetName = a.Target?.FullName ?? "Unknown",
            Token = a.Token,
            Completed = a.Completed
        });
    }
}