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
        var result = await questionService.AddQuestionToSurveyAsync(surveyId, dto);
        return Ok(result);
    }

    [HttpDelete("{questionId}")]
    public async Task<IActionResult> DeleteQuestion(int questionId)
    {
        await questionService.RemoveQuestionAsync(questionId);
        return NoContent();
    }

    [HttpPut("templates/{templateId}")]
    public async Task<IActionResult> UpdateTemplate(int templateId, UpdateQuestionTemplateDto dto)
    {
        try
        {
            var updated = questionService.UpdateTemplateAsync(templateId, dto);
            return Ok(updated);
        }
        catch (Exception ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpDelete("templates/{templateId}")]
    public async Task<IActionResult> DeleteTemplate(int templateId)
    {
        await questionService.DeleteTemplateAsync(templateId);
        return NoContent();
    }
    
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateQuestion(int id, [FromBody] UpdateQuestionDto dto)
    {
        try
        {
            var updated = await questionService.UpdateQuestionAsync(id, dto);
            return Ok(updated);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
    
    [HttpPut("surveys/{surveyId}/reorder")]
    public async Task<IActionResult> ReorderQuestions(int surveyId, [FromBody] List<UpdateQuestionOrderDto> updatedOrders)
    {
        try
        {
            await questionService.UpdateQuestionsOrderAsync(surveyId, updatedOrders);
            return Ok();
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}