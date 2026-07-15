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
    IRepository<Answer> answerRepo)
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

    // Метод экспорта в DOCX пока оставляем без изменений (он использует старую структуру, но мы его обновим позже при необходимости)
    public async Task<byte[]> ExportDocxAsync(int surveyId)
    {
        var results = await GetSurveyResultsAsync(surveyId);
        using var stream = new MemoryStream();
        using (var wordDoc = WordprocessingDocument.Create(stream, WordprocessingDocumentType.Document))
        {
            var mainPart = wordDoc.AddMainDocumentPart();
            mainPart.Document = new Document();
            var body = new Body();

            // ---- Стили ----
            // Цвета Directum (без #)
            const string orange = "FF8600";
            const string darkGray = "1E2128";

            // ---- Заголовок документа (оранжевый, жирный, 20pt) ----
            var titlePara = new Paragraph();
            var titleRun = new Run(new Text($"Результаты опроса: {results.SurveyTitle}"));
            titleRun.RunProperties = new RunProperties(
                new Bold(),
                new FontSize { Val = "40" }, // 20pt
                new Color { Val = orange }
            );
            titlePara.Append(titleRun);
            titlePara.ParagraphProperties = new ParagraphProperties(
                new Justification { Val = JustificationValues.Center }
            );
            body.Append(titlePara);

            // ---- Оранжевая разделительная линия ----
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
            body.Append(new Paragraph(new Run(new Text(" ")))); // пустая строка

            // ---- По каждому оцениваемому ----
            foreach (var empResult in results.Results)
            {
                // Имя оцениваемого (тёмно-серый, жирный, 14pt)
                var empPara = new Paragraph();
                var empRun = new Run(new Text($"Оцениваемый: {empResult.EmployeeName}"));
                empRun.RunProperties = new RunProperties(
                    new Bold(),
                    new FontSize { Val = "28" },
                    new Color { Val = darkGray }
                );
                empPara.Append(empRun);
                body.Append(empPara);
                body.Append(new Paragraph(new Run(new Text(" "))));

                // ---- По каждому оценщику ----
                foreach (var evaluator in empResult.Evaluators)
                {
                    // Оценщик + роль (оранжевый, жирный, 12pt)
                    var evalPara = new Paragraph();
                    var evalRun = new Run(new Text($"  Оценщик: {evaluator.EvaluatorName}"));
                    evalRun.RunProperties = new RunProperties(
                        new Bold(),
                        new FontSize { Val = "24" },
                        new Color { Val = orange }
                    );
                    evalPara.Append(evalRun);
                    body.Append(evalPara);

                    // ---- Вопросы и ответы ----
                    foreach (var qa in evaluator.Answers)
                    {
                        var answerText = qa.AnswerText ?? qa.SelectedOption ?? "Нет ответа";

                        // Вопрос (тёмно-серый, курсив, 11pt)
                        var qPara = new Paragraph();
                        var qRun = new Run(new Text($"    Вопрос: {qa.QuestionText}"));
                        qRun.RunProperties = new RunProperties(
                            new Italic(),
                            new FontSize { Val = "22" },
                            new Color { Val = darkGray }
                        );
                        qPara.Append(qRun);
                        body.Append(qPara);

                        // Ответ (тёмно-серый, жирный, 11pt)
                        var aPara = new Paragraph();
                        var aRun = new Run(new Text($"    Ответ: {answerText}"));
                        aRun.RunProperties = new RunProperties(
                            new Bold(),
                            new FontSize { Val = "22" },
                            new Color { Val = darkGray }
                        );
                        aPara.Append(aRun);
                        body.Append(aPara);
                    }

                    // Разделитель между оценщиками
                    var sepPara = new Paragraph();
                    var sepRun = new Run(new Text("  ---"));
                    sepRun.RunProperties = new RunProperties(
                        new Color { Val = darkGray },
                        new FontSize { Val = "18" }
                    );
                    sepPara.Append(sepRun);
                    body.Append(sepPara);
                    body.Append(new Paragraph(new Run(new Text(" "))));
                }

                // Разделитель между сотрудниками
                var empSepPara = new Paragraph();
                var empSepRun = new Run(new Text("---"));
                empSepRun.RunProperties = new RunProperties(
                    new Color { Val = darkGray },
                    new FontSize { Val = "20" }
                );
                empSepPara.Append(empSepRun);
                body.Append(empSepPara);
                body.Append(new Paragraph(new Run(new Text(" "))));
            }

            // ---- Подвал с датой и ссылкой на Directum ----
            var footerPara = new Paragraph();
            footerPara.ParagraphProperties = new ParagraphProperties(
                new Justification { Val = JustificationValues.Center }
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