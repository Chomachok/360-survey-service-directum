using AutoMapper;
using Directum360Feedback.Application.DTOs;
using Directum360Feedback.Application.Interfaces;
using Directum360Feedback.Domain.Entities;
using Directum360Feedback.Infrastructure.Repositories;
using System.Text.Json;

namespace Directum360Feedback.Application.Services;

public class QuestionService : IQuestionService
{
    private readonly IRepository<SurveyQuestion> _questionRepo;
    private readonly IRepository<Survey> _surveyRepo;
    private readonly IRepository<QuestionTemplate> _templateRepo;
    private readonly IMapper _mapper;

    public QuestionService(IRepository<SurveyQuestion> questionRepo, IRepository<Survey> surveyRepo,
        IRepository<QuestionTemplate> templateRepo, IMapper mapper)
    {
        _questionRepo = questionRepo;
        _surveyRepo = surveyRepo;
        _templateRepo = templateRepo;
        _mapper = mapper;
    }

    public async Task<IEnumerable<QuestionDto>> GetSurveyQuestionsAsync(int surveyId)
    {
        var questions = await _questionRepo.FindAsync(q => q.SurveyId == surveyId);
        return questions.OrderBy(q => q.Order).Select(q =>
        {
            var dto = _mapper.Map<QuestionDto>(q);
            if (!string.IsNullOrEmpty(q.Options))
                dto.Options = JsonSerializer.Deserialize<List<string>>(q.Options);
            return dto;
        });
    }

    public async Task<QuestionDto> AddQuestionToSurveyAsync(int surveyId, CreateQuestionDto dto)
    {
        var survey = await _surveyRepo.GetByIdAsync(surveyId);
        if (survey == null) throw new Exception("Survey not found");
        var question = _mapper.Map<SurveyQuestion>(dto);
        question.SurveyId = surveyId;
        if (dto.Options != null)
            question.Options = JsonSerializer.Serialize(dto.Options);
        await _questionRepo.AddAsync(question);
        await _questionRepo.SaveChangesAsync();
        return _mapper.Map<QuestionDto>(question);
    }

    public async Task RemoveQuestionAsync(int questionId)
    {
        var q = await _questionRepo.GetByIdAsync(questionId);
        if (q != null)
        {
            _questionRepo.Delete(q);
            await _questionRepo.SaveChangesAsync();
        }
    }

    public async Task<IEnumerable<QuestionTemplateDto>> GetTemplatesAsync()
    {
        var templates = await _templateRepo.GetAllAsync();
        return templates.Select(t =>
        {
            var dto = _mapper.Map<QuestionTemplateDto>(t);
            if (!string.IsNullOrEmpty(t.Options))
                dto.Options = JsonSerializer.Deserialize<List<string>>(t.Options);
            return dto;
        });
    }

    public async Task<QuestionTemplateDto> CreateTemplateAsync(CreateQuestionTemplateDto dto)
    {
        var template = _mapper.Map<QuestionTemplate>(dto);
        if (dto.Options != null)
            template.Options = JsonSerializer.Serialize(dto.Options);
        await _templateRepo.AddAsync(template);
        await _templateRepo.SaveChangesAsync();
        return _mapper.Map<QuestionTemplateDto>(template);
    }
}