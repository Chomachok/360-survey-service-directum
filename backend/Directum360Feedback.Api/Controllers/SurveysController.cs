using Microsoft.AspNetCore.Mvc;
using Directum360Feedback.Application.DTOs;
using Directum360Feedback.Application.Interfaces;

namespace Directum360Feedback.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SurveysController : ControllerBase
{
    private readonly ISurveyService _surveyService;

    public SurveysController(ISurveyService surveyService)
    {
        _surveyService = surveyService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll() => Ok(await _surveyService.GetAllSurveysAsync());

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(int id)
    {
        var survey = await _surveyService.GetSurveyByIdAsync(id);
        if (survey == null) return NotFound();
        return Ok(survey);
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateSurveyDto dto)
    {
        var created = await _surveyService.CreateSurveyAsync(dto);
        return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, UpdateSurveyDto dto)
    {
        try
        {
            var updated = await _surveyService.UpdateSurveyAsync(id, dto);
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
        await _surveyService.DeleteSurveyAsync(id);
        return NoContent();
    }
    
    [HttpPost("{id}/publish")]
    public async Task<IActionResult> Publish(int id)
    {
        try
        {
            var survey = await _surveyService.PublishSurveyAsync(id);
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
            var survey = await _surveyService.CompleteSurveyAsync(id);
            return Ok(survey);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}