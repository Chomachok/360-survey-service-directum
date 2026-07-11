using Microsoft.AspNetCore.Mvc;
using Directum360Feedback.Application.DTOs;
using Directum360Feedback.Application.Interfaces;

namespace Directum360Feedback.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class QuestionsController : ControllerBase
{
    private readonly IQuestionService _questionService;

    public QuestionsController(IQuestionService questionService)
    {
        _questionService = questionService;
    }

    [HttpGet("templates")]
    public async Task<IActionResult> GetTemplates() => Ok(await _questionService.GetTemplatesAsync());

    [HttpPost("templates")]
    public async Task<IActionResult> CreateTemplate(CreateQuestionTemplateDto dto)
    {
        var created = await _questionService.CreateTemplateAsync(dto);
        return Ok(created);
    }

    [HttpPost("surveys/{surveyId}")]
    public async Task<IActionResult> AddQuestion(int surveyId, CreateQuestionDto dto)
    {
        var result = await _questionService.AddQuestionToSurveyAsync(surveyId, dto);
        return Ok(result);
    }

    [HttpDelete("{questionId}")]
    public async Task<IActionResult> DeleteQuestion(int questionId)
    {
        await _questionService.RemoveQuestionAsync(questionId);
        return NoContent();
    }
}