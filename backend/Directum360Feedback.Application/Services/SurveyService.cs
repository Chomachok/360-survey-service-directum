using AutoMapper;
using Directum360Feedback.Application.DTOs;
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
                        
                        // Чтобы избежать ограничений от MailTrap
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

        // Формируем DTO для ответа
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
        survey.TargetId = dto.TargetId;
        survey.Status = SurveyStatus.Draft;
        await surveyRepo.AddAsync(survey);
        await surveyRepo.SaveChangesAsync();

        var surveyDto = mapper.Map<SurveyDto>(survey);
        surveyDto.TargetId = survey.TargetId; // явно
        var author = await employeeRepo.GetByIdAsync(survey.AuthorId);
        surveyDto.AuthorName = author?.FullName ?? "Unknown";
        return surveyDto;
    }

    public async Task<SurveyDto> UpdateSurveyAsync(int id, UpdateSurveyDto dto)
    {
        var survey = await surveyRepo.GetByIdAsync(id);
        if (survey == null) throw new Exception("Survey not found");
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
        if (survey.Status != SurveyStatus.Active) throw new Exception("Only active surveys can be completed");

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
        if (survey.Status == SurveyStatus.Active && survey.EndDate.ToUniversalTime() <= DateTime.Now.ToUniversalTime())
        {
            survey.Status = SurveyStatus.Completed;
            surveyRepo.Update(survey);
            await surveyRepo.SaveChangesAsync();
        }

        if (survey.Status == SurveyStatus.Draft && survey.StartDate.ToUniversalTime() <= DateTime.Now.ToUniversalTime())
        {
            survey.Status = SurveyStatus.Active;
            surveyRepo.Update(survey);
            await surveyRepo.SaveChangesAsync();
        }
        
        return survey;
    }
}