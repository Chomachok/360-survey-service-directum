using AutoMapper;
using Directum360Feedback.Application.DTOs;
using Directum360Feedback.Application.Interfaces;
using Directum360Feedback.Domain.Entities;
using Directum360Feedback.Infrastructure.Repositories;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using DocumentFormat.OpenXml;

namespace Directum360Feedback.Application.Services;

public class ResultService : IResultService
{
    private readonly IRepository<Survey> _surveyRepo;
    private readonly IRepository<SurveyAssignment> _assignmentRepo;
    private readonly IRepository<SurveyQuestion> _questionRepo;
    private readonly IRepository<Answer> _answerRepo;
    private readonly IRepository<Employee> _employeeRepo;
    private readonly IMapper _mapper;

    public ResultService(IRepository<Survey> surveyRepo, IRepository<SurveyAssignment> assignmentRepo,
        IRepository<SurveyQuestion> questionRepo, IRepository<Answer> answerRepo, IRepository<Employee> employeeRepo, IMapper mapper)
    {
        _surveyRepo = surveyRepo;
        _assignmentRepo = assignmentRepo;
        _questionRepo = questionRepo;
        _answerRepo = answerRepo;
        _employeeRepo = employeeRepo;
        _mapper = mapper;
    }

    public async Task<ResultDto> GetSurveyResultsAsync(int surveyId)
    {
        var survey = await _surveyRepo.GetByIdAsync(surveyId);
        if (survey == null) throw new Exception("Survey not found");

        var assignments = await _assignmentRepo.FindAsync(a => a.SurveyId == surveyId && a.Completed);
        var questions = await _questionRepo.FindAsync(q => q.SurveyId == surveyId);
        var result = new ResultDto { SurveyId = surveyId, SurveyTitle = survey.Title };

        var employeeResults = new Dictionary<int, EmployeeResultDto>();
        foreach (var a in assignments)
        {
            if (!employeeResults.ContainsKey(a.TargetId))
            {
                var target = await _employeeRepo.GetByIdAsync(a.TargetId);
                employeeResults[a.TargetId] = new EmployeeResultDto
                {
                    EmployeeId = a.TargetId,
                    EmployeeName = target?.FullName ?? "Unknown",
                    AnswersByRole = new Dictionary<Domain.Enums.AssessmentRole, List<QuestionAnswerDto>>()
                };
            }
            var answers = await _answerRepo.FindAsync(ans => ans.AssignmentId == a.Id);
            var roleAnswers = new List<QuestionAnswerDto>();
            foreach (var q in questions.OrderBy(q => q.Order))
            {
                var answer = answers.FirstOrDefault(ans => ans.QuestionId == q.Id);
                roleAnswers.Add(new QuestionAnswerDto
                {
                    QuestionText = q.Text,
                    AnswerText = answer?.TextAnswer,
                    SelectedOption = answer?.SelectedOption
                });
            }
            employeeResults[a.TargetId].AnswersByRole[a.Role] = roleAnswers;
        }

        result.Results = employeeResults.Values.ToList();
        return result;
    }

    public async Task<byte[]> ExportDocxAsync(int surveyId)
    {
        var results = await GetSurveyResultsAsync(surveyId);
        using var stream = new MemoryStream();
        using (var wordDoc = WordprocessingDocument.Create(stream, WordprocessingDocumentType.Document))
        {
            var mainPart = wordDoc.AddMainDocumentPart();
            mainPart.Document = new Document();
            var body = new Body();

            var title = new Paragraph(new Run(new Text($"Results for Survey: {results.SurveyTitle}")));
            body.Append(title);

            foreach (var empResult in results.Results)
            {
                body.Append(new Paragraph(new Run(new Text($"Employee: {empResult.EmployeeName}"))));
                foreach (var role in empResult.AnswersByRole.Keys)
                {
                    body.Append(new Paragraph(new Run(new Text($"Role: {role}"))));
                    var answers = empResult.AnswersByRole[role];
                    foreach (var qa in answers)
                    {
                        var answerText = qa.AnswerText ?? qa.SelectedOption ?? "No answer";
                        body.Append(new Paragraph(new Run(new Text($"Q: {qa.QuestionText}"))));
                        body.Append(new Paragraph(new Run(new Text($"A: {answerText}"))));
                    }
                }
                body.Append(new Paragraph(new Run(new Text("---"))));
            }

            mainPart.Document.Body = body;
            mainPart.Document.Save();
        }
        return stream.ToArray();
    }
}