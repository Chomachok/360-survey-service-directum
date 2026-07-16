using AutoMapper;
using Directum360Feedback.Application.DTOs;
using Directum360Feedback.Application.Interfaces;
using Directum360Feedback.Domain.Entities;
using Directum360Feedback.Infrastructure.Repositories;
using System.Text.Json;
using Directum360Feedback.Domain.Enums;

namespace Directum360Feedback.Application.Services;

public class PublicService(
    IRepository<SurveyAssignment> assignmentRepo,
    IRepository<SurveyQuestion> questionRepo,
    IRepository<Answer> answerRepo,
    IRepository<Employee> employeeRepo,
    IMapper mapper)
    : IPublicService
{
    public async Task<PublicSurveyDto?> GetSurveyByTokenAsync(string token)
    {
        var assignments = await assignmentRepo.FindAsync(
            a => a.Token == token,
            a => a.Survey,
            a => a.Target
        );
        var assignment = assignments.FirstOrDefault();
        if (assignment == null) return null;
        if (assignment.Completed) throw new Exception("Опрос уже пройден");

        var survey = assignment.Survey;
        if (survey.Status != SurveyStatus.Active)
            throw new Exception("Опрос не активен");

        var target = assignment.Target;
        var questions = await questionRepo.FindAsync(q => q.SurveyId == survey.Id);

        var dto = new PublicSurveyDto
        {
            SurveyId = survey.Id,
            SurveyTitle = survey.Title,
            TargetName = target?.FullName ?? "Unknown",
            Questions = questions.OrderBy(q => q.Order).Select(q => new PublicQuestionDto
            {
                Id = q.Id,
                Text = q.Text,
                Type = q.Type,
                Required = q.Required,
                Options = !string.IsNullOrEmpty(q.Options) && q.Options != "null" && q.Options != "[]"
                    ? JsonSerializer.Deserialize<List<string>>(q.Options)
                    : new List<string>() // Пустой список, если нет вариантов
            }).ToList()
        };
        return dto;
    }

    public async Task SubmitAnswersAsync(string token, SubmitAnswersDto dto)
    {
        var assignment = (await assignmentRepo.FindAsync(a => a.Token == token)).FirstOrDefault();
        if (assignment == null) throw new Exception("Invalid token");
        if (assignment.Completed) throw new Exception("Already submitted");

        foreach (var ansDto in dto.Answers)
        {
            var question = await questionRepo.GetByIdAsync(ansDto.QuestionId);
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
            await answerRepo.AddAsync(answer);
        }

        assignment.Completed = true;
        assignment.CompletedAt = DateTime.UtcNow;
        assignmentRepo.Update(assignment);
        await assignmentRepo.SaveChangesAsync();
    }
}