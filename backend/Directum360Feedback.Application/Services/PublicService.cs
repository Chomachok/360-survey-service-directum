using AutoMapper;
using Directum360Feedback.Application.DTOs;
using Directum360Feedback.Application.Interfaces;
using Directum360Feedback.Domain.Entities;
using Directum360Feedback.Infrastructure.Repositories;
using System.Text.Json;

namespace Directum360Feedback.Application.Services;

public class PublicService : IPublicService
{
    private readonly IRepository<SurveyAssignment> _assignmentRepo;
    private readonly IRepository<SurveyQuestion> _questionRepo;
    private readonly IRepository<Answer> _answerRepo;
    private readonly IRepository<Employee> _employeeRepo;
    private readonly IMapper _mapper;

    public PublicService(IRepository<SurveyAssignment> assignmentRepo, IRepository<SurveyQuestion> questionRepo,
        IRepository<Answer> answerRepo, IRepository<Employee> employeeRepo, IMapper mapper)
    {
        _assignmentRepo = assignmentRepo;
        _questionRepo = questionRepo;
        _answerRepo = answerRepo;
        _employeeRepo = employeeRepo;
        _mapper = mapper;
    }

    public async Task<PublicSurveyDto?> GetSurveyByTokenAsync(string token)
    {
        var assignment = (await _assignmentRepo.FindAsync(
            a => a.Token == token,
            a => a.Survey,
            a => a.Target
        )).FirstOrDefault();

        if (assignment == null) return null;
        if (assignment.Completed) throw new Exception("Survey already completed");

        var survey = assignment.Survey;
        var target = assignment.Target;
        var questions = await _questionRepo.FindAsync(q => q.SurveyId == survey.Id);

        var dto = new PublicSurveyDto
        {
            SurveyId = survey.Id,
            SurveyTitle = survey.Title,
            TargetName = target?.FullName ?? "Unknown",
            Role = assignment.Role,
            Questions = questions.OrderBy(q => q.Order).Select(q => new PublicQuestionDto
            {
                Id = q.Id,
                Text = q.Text,
                Type = q.Type,
                Required = q.Required,
                Options = string.IsNullOrEmpty(q.Options) ? null : JsonSerializer.Deserialize<List<string>>(q.Options)
            }).ToList()
        };
        return dto;
    }

    public async Task SubmitAnswersAsync(string token, SubmitAnswersDto dto)
    {
        var assignment = (await _assignmentRepo.FindAsync(a => a.Token == token)).FirstOrDefault();
        if (assignment == null) throw new Exception("Invalid token");
        if (assignment.Completed) throw new Exception("Already submitted");

        foreach (var ansDto in dto.Answers)
        {
            var question = await _questionRepo.GetByIdAsync(ansDto.QuestionId);
            if (question == null) throw new Exception("Question not found");
            if (question.Required && string.IsNullOrEmpty(ansDto.TextAnswer) && string.IsNullOrEmpty(ansDto.SelectedOption))
                throw new Exception($"Question {question.Id} is required");

            var answer = new Answer
            {
                AssignmentId = assignment.Id,
                QuestionId = ansDto.QuestionId,
                TextAnswer = ansDto.TextAnswer,
                SelectedOption = ansDto.SelectedOption
            };
            await _answerRepo.AddAsync(answer);
        }

        assignment.Completed = true;
        assignment.CompletedAt = DateTime.UtcNow;
        _assignmentRepo.Update(assignment);
        await _assignmentRepo.SaveChangesAsync();
    }
}