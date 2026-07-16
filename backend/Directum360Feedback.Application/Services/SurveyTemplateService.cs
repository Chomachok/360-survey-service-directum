using AutoMapper;
using Directum360Feedback.Application.Interfaces;
using Directum360Feedback.Domain.Entities;
using Directum360Feedback.Infrastructure.Repositories;
using System.Text.Json;
using Directum360Feedback.Application.DTOs.SurveyTemplateDTOs;

namespace Directum360Feedback.Application.Services;

public class SurveyTemplateService(
    IRepository<SurveyTemplate> templateRepo,
    IRepository<SurveyTemplateQuestion> questionRepo,
    IMapper mapper)
    : ISurveyTemplateService
{
    public async Task<IEnumerable<SurveyTemplateDto>> GetAllAsync()
    {
        var templates = await templateRepo.GetAllAsync();
        var result = new List<SurveyTemplateDto>();
        foreach (var t in templates)
        {
            var questions = await questionRepo.FindAsync(q => q.SurveyTemplateId == t.Id);
            var dto = mapper.Map<SurveyTemplateDto>(t);
            dto.Questions = questions.OrderBy(q => q.Order).Select(q =>
            {
                var qDto = mapper.Map<TemplateQuestionDto>(q);
                if (!string.IsNullOrEmpty(q.Options))
                {
                    try
                    {
                        qDto.Options = JsonSerializer.Deserialize<List<string>>(q.Options);
                    }
                    catch
                    {
                        qDto.Options = null;
                    }
                }
                return qDto;
            }).ToList();
            result.Add(dto);
        }
        return result;
    }

    public async Task<SurveyTemplateDto?> GetByIdAsync(int id)
    {
        var template = await templateRepo.GetByIdAsync(id);
        if (template == null) return null;
        var questions = await questionRepo.FindAsync(q => q.SurveyTemplateId == id);
        var dto = mapper.Map<SurveyTemplateDto>(template);
        dto.Questions = questions.OrderBy(q => q.Order).Select(q =>
        {
            var qDto = mapper.Map<TemplateQuestionDto>(q);
            if (!string.IsNullOrEmpty(q.Options))
            {
                try
                {
                    qDto.Options = JsonSerializer.Deserialize<List<string>>(q.Options);
                }
                catch
                {
                    qDto.Options = null;
                }
            }
            return qDto;
        }).ToList();
        return dto;
    }

    public async Task<SurveyTemplateDto> CreateAsync(CreateSurveyTemplateDto dto)
    {
        // Создаём шаблон
        var template = mapper.Map<SurveyTemplate>(dto);

        // Добавляем вопросы в коллекцию шаблона
        foreach (var qDto in dto.Questions.OrderBy(q => q.Order))
        {
            var question = mapper.Map<SurveyTemplateQuestion>(qDto);
            if (qDto.Options != null && qDto.Options.Any())
                question.Options = JsonSerializer.Serialize(qDto.Options);
            else
                question.Options = null;
            template.Questions.Add(question);
        }

        // Сохраняем шаблон вместе с вопросами
        await templateRepo.AddAsync(template);
        await templateRepo.SaveChangesAsync();

        // Формируем DTO для ответа
        var result = mapper.Map<SurveyTemplateDto>(template);
        result.Questions = template.Questions.OrderBy(q => q.Order).Select(q =>
        {
            var qDto = mapper.Map<TemplateQuestionDto>(q);
            if (!string.IsNullOrEmpty(q.Options))
            {
                try
                {
                    qDto.Options = JsonSerializer.Deserialize<List<string>>(q.Options);
                }
                catch
                {
                    qDto.Options = null;
                }
            }
            return qDto;
        }).ToList();

        return result;
    }

    public async Task<SurveyTemplateDto> UpdateAsync(int id, UpdateSurveyTemplateDto dto)
    {
        var template = await templateRepo.GetByIdAsync(id);
        if (template == null) throw new Exception("Template not found");

        template.Name = dto.Name;
        template.Description = dto.Description;

        // Удаляем старые вопросы
        var oldQuestions = await questionRepo.FindAsync(q => q.SurveyTemplateId == id);
        foreach (var q in oldQuestions)
            questionRepo.Delete(q);
        await questionRepo.SaveChangesAsync();

        // Добавляем новые вопросы
        foreach (var qDto in dto.Questions.OrderBy(q => q.Order))
        {
            var question = mapper.Map<SurveyTemplateQuestion>(qDto);
            question.SurveyTemplateId = template.Id;
            if (qDto.Options != null && qDto.Options.Any())
                question.Options = JsonSerializer.Serialize(qDto.Options);
            else
                question.Options = null;
            await questionRepo.AddAsync(question);
        }
        await questionRepo.SaveChangesAsync();

        return await GetByIdAsync(id) ?? throw new Exception("Failed to update template");
    }

    public async Task DeleteAsync(int id)
    {
        var template = await templateRepo.GetByIdAsync(id);
        if (template == null) return;
        templateRepo.Delete(template);
        await templateRepo.SaveChangesAsync();
    }
}