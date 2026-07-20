using AutoMapper;
using Directum360Feedback.Application.DTOs;
using Directum360Feedback.Application.Interfaces;
using Directum360Feedback.Domain.Entities;
using Directum360Feedback.Infrastructure.Repositories;
using System.Text.Json;
using Directum360Feedback.Domain.Enums;

namespace Directum360Feedback.Application.Services;

public class QuestionService(
    IRepository<SurveyQuestion> questionRepo,
    IRepository<Survey> surveyRepo,
    IRepository<QuestionTemplate> templateRepo,
    IMapper mapper)
    : IQuestionService
{
    public async Task<IEnumerable<QuestionDto>> GetSurveyQuestionsAsync(int surveyId)
    {
        var questions = await questionRepo.FindAsync(q => q.SurveyId == surveyId);
        return questions.OrderBy(q => q.Order).Select(q =>
        {
            var dto = mapper.Map<QuestionDto>(q);
            if (!string.IsNullOrEmpty(q.Options))
            {
                try
                {
                    dto.Options = JsonSerializer.Deserialize<List<string>>(q.Options);
                }
                catch
                {
                    // Если Options невалидный JSON (например, строка "SingleChoice"), оставляем null
                    dto.Options = null;
                }
            }
            return dto;
        });
    }

    public async Task<QuestionDto> AddQuestionToSurveyAsync(int surveyId, CreateQuestionDto dto)
    {
        var survey = await surveyRepo.GetByIdAsync(surveyId);
        if (survey == null) throw new Exception("Survey not found");
        var question = mapper.Map<SurveyQuestion>(dto);
        question.SurveyId = surveyId;
        if (dto.Options != null)
            question.Options = JsonSerializer.Serialize(dto.Options);
        await questionRepo.AddAsync(question);
        await questionRepo.SaveChangesAsync();
        return mapper.Map<QuestionDto>(question);
    }

    public async Task RemoveQuestionAsync(int questionId)
    {
        var q = await questionRepo.GetByIdAsync(questionId);
        if (q != null)
        {
            questionRepo.Delete(q);
            await questionRepo.SaveChangesAsync();
        }
    }

    public async Task<IEnumerable<QuestionTemplateDto>> GetTemplatesAsync()
    {
        var templates = await templateRepo.GetAllAsync();
        return templates.Select(t =>
        {
            var dto = mapper.Map<QuestionTemplateDto>(t);
            if (!string.IsNullOrEmpty(t.Options))
                dto.Options = JsonSerializer.Deserialize<List<string>>(t.Options);
            return dto;
        });
    }

    public async Task<QuestionTemplateDto> CreateTemplateAsync(CreateQuestionTemplateDto dto)
    {
        var template = mapper.Map<QuestionTemplate>(dto);
        if (dto.Options != null)
            template.Options = JsonSerializer.Serialize(dto.Options);
        await templateRepo.AddAsync(template);
        await templateRepo.SaveChangesAsync();
        return mapper.Map<QuestionTemplateDto>(template);
    }

    public async Task<QuestionTemplateDto> UpdateTemplateAsync(int id, UpdateQuestionTemplateDto dto)
    {
        var template = await templateRepo.GetByIdAsync(id);
        if (template == null)
            throw new Exception("Template not found");

        template.Name = dto.Name;
        template.Text = dto.Text;
        template.Type = dto.Type;

        // Обновляем Options, если они переданы
        if (dto.Options != null)
        {
            var optionsToStore = dto.Options
                .Where(o => !string.IsNullOrWhiteSpace(o))
                .ToList();
            template.Options = optionsToStore.Any() 
                ? JsonSerializer.Serialize(optionsToStore) 
                : null;
        }
        // Если dto.Options == null, оставляем текущее значение (не перезаписываем)

        templateRepo.Update(template);
        await templateRepo.SaveChangesAsync();

        // Формируем DTO для ответа с безопасной десериализацией
        var result = mapper.Map<QuestionTemplateDto>(template);
        if (!string.IsNullOrEmpty(template.Options) && template.Options != "null" && template.Options != "[]")
        {
            try
            {
                result.Options = JsonSerializer.Deserialize<List<string>>(template.Options);
            }
            catch (JsonException)
            {
                result.Options = null;
            }
        }
        else
        {
            result.Options = null;
        }
        return result;
    }

    public async Task DeleteTemplateAsync(int id)
    {
        var template = await templateRepo.GetByIdAsync(id);
        if (template != null)
        {
            templateRepo.Delete(template);
            await templateRepo.SaveChangesAsync();
        }
    }
    
    public async Task<QuestionDto> UpdateQuestionAsync(int id, UpdateQuestionDto dto)
    {
        var question = await questionRepo.GetByIdAsync(id);
        if (question == null)
            throw new Exception("Question not found");

        // Проверяем, что опрос в статусе Draft
        var survey = await surveyRepo.GetByIdAsync(question.SurveyId);
        if (survey == null)
            throw new Exception("Survey not found");
        if (survey.Status != SurveyStatus.Draft)
            throw new Exception("Cannot edit question because survey is not in Draft status");

        question.Text = dto.Text;
        question.Type = dto.Type;
        question.Required = dto.Required;

        if (dto.Options != null && dto.Options.Any())
            question.Options = JsonSerializer.Serialize(dto.Options);
        else
            question.Options = null;

        questionRepo.Update(question);
        await questionRepo.SaveChangesAsync();

        var result = mapper.Map<QuestionDto>(question);
        if (!string.IsNullOrEmpty(question.Options))
            result.Options = JsonSerializer.Deserialize<List<string>>(question.Options);
        return result;
    }
    
    public async Task UpdateQuestionsOrderAsync(int surveyId, List<UpdateQuestionOrderDto> updatedOrders)
    {
        // Загружаем все вопросы опроса
        var questions = await questionRepo.FindAsync(q => q.SurveyId == surveyId);
        if (!questions.Any())
            throw new Exception("Вопросы для данного опроса не найдены");

        // Проверяем, что все ID из запроса принадлежат этому опросу
        var questionIds = questions.Select(q => q.Id).ToHashSet();
        foreach (var item in updatedOrders)
        {
            if (!questionIds.Contains(item.Id))
                throw new Exception($"Вопрос с ID {item.Id} не принадлежит данному опросу");
        }

        // Обновляем порядок
        foreach (var item in updatedOrders)
        {
            var question = questions.First(q => q.Id == item.Id);
            question.Order = item.Order;
            questionRepo.Update(question);
        }

        await questionRepo.SaveChangesAsync();
    }
    
    public async Task<QuestionTemplateDto> SaveQuestionAsTemplateAsync(int questionId, string templateName)
    {
        var question = await questionRepo.GetByIdAsync(questionId);
        if (question == null)
            throw new Exception("Вопрос не найден");

        var template = new QuestionTemplate
        {
            Name = templateName,
            Text = question.Text,
            Type = question.Type,
            Options = question.Options
        };

        await templateRepo.AddAsync(template);
        await templateRepo.SaveChangesAsync();

        var dto = mapper.Map<QuestionTemplateDto>(template);
        if (!string.IsNullOrEmpty(template.Options))
            dto.Options = JsonSerializer.Deserialize<List<string>>(template.Options);
        return dto;
    }
}