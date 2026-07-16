using AutoMapper;
using Directum360Feedback.Application.Interfaces;
using Directum360Feedback.Domain.Entities;
using Directum360Feedback.Infrastructure.Repositories;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using Directum360Feedback.Application.DTOs.ResultDTOs;
using Bold = DocumentFormat.OpenXml.Wordprocessing.Bold;
using Document = DocumentFormat.OpenXml.Wordprocessing.Document;
using FontSize = DocumentFormat.OpenXml.Wordprocessing.FontSize;
using Run = DocumentFormat.OpenXml.Wordprocessing.Run;
using RunProperties = DocumentFormat.OpenXml.Wordprocessing.RunProperties;
using Text = DocumentFormat.OpenXml.Wordprocessing.Text;

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

        var targetGroups = assignments.GroupBy(a => a.TargetId);
        var questions = await questionRepo.FindAsync(q => q.SurveyId == surveyId);
        var orderedQuestions = questions.OrderBy(q => q.Order).ToList();

        var result = new ResultDto
        {
            SurveyId = surveyId,
            SurveyTitle = survey.Title,
            Results = new List<EmployeeResultDto>()
        };

        foreach (var targetGroup in targetGroups)
        {
            var targetId = targetGroup.Key;
            var target = targetGroup.First().Target;

            var employeeResult = new EmployeeResultDto
            {
                EmployeeId = targetId,
                EmployeeName = target?.FullName ?? "Unknown",
                Evaluators = new List<EvaluatorResultDto>()
            };

            foreach (var assignment in targetGroup)
            {
                var answers = await answerRepo.FindAsync(a => a.AssignmentId == assignment.Id);

                var evaluatorResult = new EvaluatorResultDto
                {
                    EvaluatorId = assignment.EvaluatorId,
                    EvaluatorName = assignment.Evaluator.FullName,
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

    public async Task<byte[]> ExportDocxAsync(int surveyId)
    {
        var results = await GetSurveyResultsAsync(surveyId);
        using var stream = new MemoryStream();
        using (var wordDoc = WordprocessingDocument.Create(stream, DocumentFormat.OpenXml.WordprocessingDocumentType.Document))
        {
            var mainPart = wordDoc.AddMainDocumentPart();
            mainPart.Document = new Document();
            var body = new Body();

            // Цвета Directum (без #)
            const string orange = "FF8600";
            const string darkGray = "1E2128";

            // Заголовок (оранжевый, жирный, 20pt)
            var titlePara = new Paragraph();
            var titleRun = new Run(new Text($"Результаты опроса: {results.SurveyTitle}"));
            titleRun.RunProperties = new RunProperties(
                new Bold(),
                new FontSize { Val = "40" },
                new Color { Val = orange }
            );
            titlePara.Append(titleRun);
            titlePara.ParagraphProperties = new ParagraphProperties(
                new Justification { Val = JustificationValues.Center },
                new SpacingBetweenLines { After = "240" } // отступ после заголовка
            );
            body.Append(titlePara);

            // Оранжевая разделительная линия
            var linePara = new Paragraph();
            var lineRun = new Run(new Text(new string('_', 80)));
            lineRun.RunProperties = new RunProperties(
                new Color { Val = orange },
                new FontSize { Val = "20" }
            );
            linePara.Append(lineRun);
            linePara.ParagraphProperties = new ParagraphProperties(
                new Justification { Val = JustificationValues.Center }
            );
            body.Append(linePara);
            body.Append(new Paragraph(new Run(new Text(" "))));

            // Сбор всех ответов по вопросам
            var questionAnswers = new Dictionary<string, List<(string EvaluatorName, string Answer)>>();

            foreach (var emp in results.Results)
            {
                foreach (var evaluator in emp.Evaluators)
                {
                    foreach (var qa in evaluator.Answers)
                    {
                        if (!questionAnswers.ContainsKey(qa.QuestionText))
                            questionAnswers[qa.QuestionText] = new List<(string, string)>();

                        var answerText = qa.AnswerText ?? qa.SelectedOption ?? "Нет ответа";
                        questionAnswers[qa.QuestionText].Add((evaluator.EvaluatorName, answerText));
                    }
                }
            }

            // Вывод вопросов и ответов
            foreach (var kvp in questionAnswers)
            {
                var questionText = kvp.Key;
                var answers = kvp.Value;

                // Вопрос (тёмно-серый, жирный, 12pt)
                var qPara = new Paragraph();
                var qRun = new Run(new Text(questionText));
                qRun.RunProperties = new RunProperties(
                    new Bold(),
                    new FontSize { Val = "24" },
                    new Color { Val = darkGray }
                );
                qPara.Append(qRun);
                qPara.ParagraphProperties = new ParagraphProperties(
                    new SpacingBetweenLines { After = "120" }
                );
                body.Append(qPara);

                // Ответы
                foreach (var (evaluatorName, answer) in answers)
                {
                    var aPara = new Paragraph();
                    var aRun = new Run(new Text($"    {evaluatorName}: {answer}"));
                    aRun.RunProperties = new RunProperties(
                        new FontSize { Val = "22" },
                        new Color { Val = darkGray }
                    );
                    aPara.Append(aRun);
                    aPara.ParagraphProperties = new ParagraphProperties(
                        new SpacingBetweenLines { After = "60" }
                    );
                    body.Append(aPara);
                }

                body.Append(new Paragraph(new Run(new Text(" ")))); // пустая строка между вопросами
            }

            if (questionAnswers.Count == 0)
            {
                var emptyPara = new Paragraph();
                var emptyRun = new Run(new Text("Нет данных для отображения."));
                emptyRun.RunProperties = new RunProperties(
                    new FontSize { Val = "24" },
                    new Color { Val = darkGray }
                );
                emptyPara.Append(emptyRun);
                body.Append(emptyPara);
            }

            // Подвал (дата и бренд)
            var footerPara = new Paragraph();
            footerPara.ParagraphProperties = new ParagraphProperties(
                new Justification { Val = JustificationValues.Center },
                new SpacingBetweenLines { Before = "240" }
            );
            var footerRun = new Run(new Text($"Сформировано: {DateTime.Now:dd.MM.yyyy HH:mm}  |  Directum360 Feedback Service"));
            footerRun.RunProperties = new RunProperties(
                new FontSize { Val = "18" },
                new Color { Val = darkGray },
                new Italic()
            );
            footerPara.Append(footerRun);
            body.Append(footerPara);

            mainPart.Document.Body = body;
            mainPart.Document.Save();
        }

        stream.Position = 0;
        return stream.ToArray();
    }
}