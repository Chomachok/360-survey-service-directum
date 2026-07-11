using Microsoft.AspNetCore.Mvc;
using Directum360Feedback.Application.DTOs;
using Directum360Feedback.Application.Interfaces;

namespace Directum360Feedback.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class QuestionsController(IQuestionService questionService) : ControllerBase
{
    [HttpGet("templates")]
    public async Task<IActionResult> GetTemplates()
    {
        var templates = await questionService.GetTemplatesAsync();
        return Ok(templates);
    }

    [HttpPost("templates")]
    public async Task<IActionResult> CreateTemplate(CreateQuestionTemplateDto dto)
    {
        var created = await questionService.CreateTemplateAsync(dto);
        return Ok(created);
    }

    [HttpGet("surveys/{surveyId}")]
    public async Task<IActionResult> GetQuestionsForSurvey(int surveyId)
    {
        var questions = await questionService.GetSurveyQuestionsAsync(surveyId);
        return Ok(questions);
    }

    [HttpPost("surveys/{surveyId}")]
    public async Task<IActionResult> AddQuestion(int surveyId, CreateQuestionDto dto)
    {
        Console.WriteLine($"✅ AddQuestion called with surveyId={surveyId}");
        Console.WriteLine($"📦 DTO: Text={dto.Text}, Type={dto.Type}, Required={dto.Required}, Order={dto.Order}, Options={dto.Options?.Count ?? 0}");
        var result = await questionService.AddQuestionToSurveyAsync(surveyId, dto);
        return Ok(result);
    }

    [HttpDelete("{questionId}")]
    public async Task<IActionResult> DeleteQuestion(int questionId)
    {
        await questionService.RemoveQuestionAsync(questionId);
        return NoContent();
    }
}