using AutoMapper;
using Directum360Feedback.Application.Interfaces;
using Directum360Feedback.Domain.Entities;
using Directum360Feedback.Infrastructure.Repositories;
using Directum360Feedback.Application.DTOs.ResultDTOs;
using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;

namespace Directum360Feedback.Application.Services;

public class ResultService(
    IRepository<Survey> surveyRepo,
    IRepository<SurveyAssignment> assignmentRepo,
    IRepository<SurveyQuestion> questionRepo,
    IRepository<Answer> answerRepo,
    IRepository<Employee> employeeRepo,
    IMapper mapper)
    : IResultService
{
    public async Task<ResultDto> GetSurveyResultsAsync(int surveyId)
    {
        var survey = await surveyRepo.GetByIdAsync(surveyId);
        if (survey == null)
            throw new Exception("Survey not found");

        // Загружаем все завершённые назначения (assignment) с навигационными свойствами
        var assignments = await assignmentRepo.FindAsync(
            a => a.SurveyId == surveyId && a.Completed,
            a => a.Evaluator,
            a => a.Target
        );

        if (!assignments.Any())
            return new ResultDto
            {
                SurveyId = surveyId,
                SurveyTitle = survey.Title,
                Results = new List<EmployeeResultDto>()
            };

        // Группируем назначения по оцениваемому сотруднику (Target)
        var targetGroups = assignments.GroupBy(a => a.TargetId);

        var result = new ResultDto
        {
            SurveyId = surveyId,
            SurveyTitle = survey.Title,
            Results = []
        };

        // Получаем все вопросы опроса для порядка
        var questions = await questionRepo.FindAsync(q => q.SurveyId == surveyId);
        var orderedQuestions = questions.OrderBy(q => q.Order).ToList();

        foreach (var targetGroup in targetGroups)
        {
            var targetId = targetGroup.Key;
            var target = targetGroup.First().Target; // берём первого для получения имени

            var employeeResult = new EmployeeResultDto
            {
                EmployeeId = targetId,
                EmployeeName = target?.FullName ?? "Unknown",
                Evaluators = new List<EvaluatorResultDto>()
            };

            foreach (var assignment in targetGroup)
            {
                // Загружаем ответы для этого назначения
                var answers = await answerRepo.FindAsync(a => a.AssignmentId == assignment.Id);

                var evaluatorResult = new EvaluatorResultDto
                {
                    EvaluatorId = assignment.EvaluatorId,
                    EvaluatorName = assignment.Evaluator?.FullName ?? "Unknown",
                    Role = assignment.Role,
                    Answers = new List<QuestionAnswerDto>()
                };

                foreach (var question in orderedQuestions)
                {
                    var answer = answers.FirstOrDefault(a => a.QuestionId == question.Id);
                    evaluatorResult.Answers.Add(new QuestionAnswerDto
                    {
                        QuestionText = question.Text,
                        AnswerText = answer?.TextAnswer,
                        SelectedOption = answer?.SelectedOption
                    });
                }

                employeeResult.Evaluators.Add(evaluatorResult);
            }

            result.Results.Add(employeeResult);
        }

        return result;
    }

    // Метод экспорта в DOCX пока оставляем без изменений (он использует старую структуру, но мы его обновим позже при необходимости)
    public async Task<byte[]> ExportDocxAsync(int surveyId)
    {
        // Получаем детализированные результаты
        var results = await GetSurveyResultsAsync(surveyId);
        using var stream = new MemoryStream();
        using var wordDoc = WordprocessingDocument.Create(stream, WordprocessingDocumentType.Document);
        var mainPart = wordDoc.AddMainDocumentPart();
        mainPart.Document = new Document();
        var body = new Body();

        var title = new Paragraph(new Run(new Text($"Результаты опроса: {results.SurveyTitle}")));
        body.Append(title);

        foreach (var empResult in results.Results)
        {
            body.Append(new Paragraph(new Run(new Text($"Оцениваемый: {empResult.EmployeeName}"))));

            foreach (var evaluator in empResult.Evaluators)
            {
                body.Append(new Paragraph(new Run(new Text($"  Оценщик: {evaluator.EvaluatorName} (Роль: {evaluator.Role})"))));
                foreach (var qa in evaluator.Answers)
                {
                    var answerText = qa.AnswerText ?? qa.SelectedOption ?? "Нет ответа";
                    body.Append(new Paragraph(new Run(new Text($"    Вопрос: {qa.QuestionText}"))));
                    body.Append(new Paragraph(new Run(new Text($"    Ответ: {answerText}"))));
                }
                body.Append(new Paragraph(new Run(new Text("  ---"))));
            }
            body.Append(new Paragraph(new Run(new Text("---"))));
        }

        mainPart.Document.Body = body;
        mainPart.Document.Save();
        return stream.ToArray();
    }
}