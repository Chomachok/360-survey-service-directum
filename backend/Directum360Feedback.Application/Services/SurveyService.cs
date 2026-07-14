using AutoMapper;
using Directum360Feedback.Application.DTOs;
using Directum360Feedback.Application.Interfaces;
using Directum360Feedback.Domain.Entities;
using Directum360Feedback.Domain.Enums;
using Directum360Feedback.Infrastructure.Repositories;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Directum360Feedback.Application.Services;

public class SurveyService : ISurveyService
{
    private readonly IRepository<Survey> _surveyRepo;
    private readonly IRepository<Employee> _employeeRepo;
    private readonly IRepository<SurveyQuestion> _surveyQuestionRepo;
    private readonly IRepository<SurveyTemplate> _surveyTemplateRepo;
    private readonly IRepository<SurveyTemplateQuestion> _templateQuestionRepo;
    private readonly IMapper _mapper;
    private readonly IConfiguration _configuration;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly string _baseUrl;

    public SurveyService(
        IRepository<Survey> surveyRepo,
        IRepository<Employee> employeeRepo,
        IRepository<SurveyQuestion> surveyQuestionRepo,
        IRepository<SurveyTemplate> surveyTemplateRepo,
        IRepository<SurveyTemplateQuestion> templateQuestionRepo,
        IMapper mapper,
        IConfiguration configuration,
        IServiceScopeFactory scopeFactory)
    {
        _surveyRepo = surveyRepo;
        _employeeRepo = employeeRepo;
        _surveyQuestionRepo = surveyQuestionRepo;
        _surveyTemplateRepo = surveyTemplateRepo;
        _templateQuestionRepo = templateQuestionRepo;
        _mapper = mapper;
        _configuration = configuration;
        _scopeFactory = scopeFactory;
        _baseUrl = configuration["BaseUrl"] ?? "http://localhost:5173";
    }

    public async Task<SurveyDto> PublishSurveyAsync(int id)
    {
        var survey = await _surveyRepo.GetByIdAsync(id);
        if (survey == null)
            throw new Exception("Survey not found");

        if (survey.Status != SurveyStatus.Draft)
            throw new Exception("Only drafts can be published");

        survey.Status = SurveyStatus.Active;
        _surveyRepo.Update(survey);
        await _surveyRepo.SaveChangesAsync();

        // --- Отправка писем всем назначениям, у которых ещё не отправлено ---
        _ = Task.Run(async () =>
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
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

        var dto = _mapper.Map<SurveyDto>(survey);
        var author = await _employeeRepo.GetByIdAsync(survey.AuthorId);
        dto.AuthorName = author?.FullName ?? "Unknown";
        return dto;
    }

    public async Task<IEnumerable<SurveyDto>> GetAllSurveysAsync(string? status = null, string? search = null)
    {
        var surveys = await _surveyRepo.GetAllAsync();
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
            var dto = _mapper.Map<SurveyDto>(updatedSurvey);
            var author = await _employeeRepo.GetByIdAsync(updatedSurvey.AuthorId);
            dto.AuthorName = author?.FullName ?? "Unknown";
            result.Add(dto);
        }
        return result;
    }

    public async Task<SurveyDto?> GetSurveyByIdAsync(int id)
    {
        var survey = await _surveyRepo.GetByIdAsync(id);
        if (survey == null) return null;
        var updatedSurvey = await CheckAndUpdateAsync(survey);
        var dto = _mapper.Map<SurveyDto>(updatedSurvey);
        var author = await _employeeRepo.GetByIdAsync(updatedSurvey.AuthorId);
        dto.AuthorName = author?.FullName ?? "Unknown";
        return dto;
    }

    public async Task<SurveyDto> CreateSurveyAsync(CreateSurveyDto dto)
    {
        var survey = _mapper.Map<Survey>(dto);
        survey.Status = SurveyStatus.Draft;
        survey.TargetId = dto.TargetId;
        await _surveyRepo.AddAsync(survey);
        await _surveyRepo.SaveChangesAsync();

        if (dto.TemplateId.HasValue)
        {
            await ApplyTemplateToSurveyAsync(survey.Id, dto.TemplateId.Value);
        }

        var surveyDto = _mapper.Map<SurveyDto>(survey);
        var author = await _employeeRepo.GetByIdAsync(survey.AuthorId);
        surveyDto.AuthorName = author?.FullName ?? "Unknown";
        return surveyDto;
    }

    public async Task<SurveyDto> UpdateSurveyAsync(int id, UpdateSurveyDto dto)
    {
        var survey = await _surveyRepo.GetByIdAsync(id);
        if (survey == null) throw new Exception("Survey not found");
        if (survey.Status != SurveyStatus.Draft)
            throw new Exception("Редактирование доступно только для черновиков");

        _mapper.Map(dto, survey);
        _surveyRepo.Update(survey);
        await _surveyRepo.SaveChangesAsync();
        return _mapper.Map<SurveyDto>(survey);
    }

    public async Task DeleteSurveyAsync(int id)
    {
        var survey = await _surveyRepo.GetByIdAsync(id);
        if (survey != null)
        {
            _surveyRepo.Delete(survey);
            await _surveyRepo.SaveChangesAsync();
        }
    }

    public async Task<SurveyDto> CompleteSurveyAsync(int id)
    {
        var survey = await _surveyRepo.GetByIdAsync(id);
        if (survey == null) throw new Exception("Survey not found");
        if (survey.Status != SurveyStatus.Active)
            throw new Exception("Only active surveys can be completed");

        survey.Status = SurveyStatus.Completed;
        _surveyRepo.Update(survey);
        await _surveyRepo.SaveChangesAsync();

        var dto = _mapper.Map<SurveyDto>(survey);
        var author = await _employeeRepo.GetByIdAsync(survey.AuthorId);
        dto.AuthorName = author?.FullName ?? "Unknown";
        return dto;
    }

    private async Task<Survey> CheckAndUpdateAsync(Survey survey)
    {
        if (survey.Status == SurveyStatus.Active && survey.EndDate.ToUniversalTime() <= DateTime.UtcNow)
        {
            survey.Status = SurveyStatus.Completed;
            _surveyRepo.Update(survey);
            await _surveyRepo.SaveChangesAsync();
        }

        if (survey.Status == SurveyStatus.Draft && survey.StartDate.ToUniversalTime() <= DateTime.UtcNow)
        {
            survey.Status = SurveyStatus.Active;
            _surveyRepo.Update(survey);
            await _surveyRepo.SaveChangesAsync();
        }

        return survey;
    }

    public async Task ApplyTemplateToSurveyAsync(int surveyId, int templateId)
    {
        var survey = await _surveyRepo.GetByIdAsync(surveyId);
        if (survey == null) throw new Exception("Survey not found");

        var template = await _surveyTemplateRepo.GetByIdAsync(templateId);
        if (template == null) throw new Exception("Template not found");

        var templateQuestions = await _templateQuestionRepo.FindAsync(q => q.SurveyTemplateId == templateId);

        // Удаляем существующие вопросы опроса
        var existingQuestions = await _surveyQuestionRepo.FindAsync(q => q.SurveyId == surveyId);
        foreach (var q in existingQuestions)
            _surveyQuestionRepo.Delete(q);
        await _surveyQuestionRepo.SaveChangesAsync();

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
            await _surveyQuestionRepo.AddAsync(question);
        }
        await _surveyQuestionRepo.SaveChangesAsync();
    }
}