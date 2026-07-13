using Microsoft.AspNetCore.Mvc;
using Directum360Feedback.Application.DTOs;
using Directum360Feedback.Application.Interfaces;

namespace Directum360Feedback.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SurveysController(ISurveyService surveyService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? status, [FromQuery] string? search)
    {
        var surveys = await surveyService.GetAllSurveysAsync(status, search);
        return Ok(surveys);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(int id)
    {
        var survey = await surveyService.GetSurveyByIdAsync(id);
        if (survey == null) return NotFound();
        return Ok(survey);
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateSurveyDto dto)
    {
        var created = await surveyService.CreateSurveyAsync(dto);
        return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, UpdateSurveyDto dto)
    {
        try
        {
            var updated = await surveyService.UpdateSurveyAsync(id, dto);
            return Ok(updated);
        }
        catch (Exception ex)
        {
            return NotFound(ex.Message);
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        await surveyService.DeleteSurveyAsync(id);
        return NoContent();
    }
    
    [HttpPost("{id}/publish")]
    public async Task<IActionResult> Publish(int id)
    {
        try
        {
            var survey = await surveyService.PublishSurveyAsync(id);
            return Ok(survey);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
    
    [HttpPost("{id}/complete")]
    public async Task<IActionResult> Complete(int id)
    {
        try
        {
            var survey = await surveyService.CompleteSurveyAsync(id);
            return Ok(survey);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}