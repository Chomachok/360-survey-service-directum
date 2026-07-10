using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using Survey360.Api.DTOs.Surveys;
using Survey360.Api.Interfaces;

namespace Survey360.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SurveysController(ISurveysService surveysService, IValidator<SurveyCreateRequest> validator) : ControllerBase
{
    [HttpPost("create")]
    public async Task<ActionResult<SurveyCreateRequest>> Create([FromBody] SurveyCreateRequest surveyCreateRequest)
    {
        var validationResult = await validator.ValidateAsync(surveyCreateRequest);
        if (!validationResult.IsValid)
            return BadRequest(validationResult.Errors);

        var createdSurvey = await surveysService.CreateSurveyAsync(surveyCreateRequest);
        var localUri = $"/api/surveys/{createdSurvey.Id}";

        return Created(localUri, createdSurvey);
    }

    [HttpGet]
    public async Task<ActionResult<SurveySummaryResponse>> GetAllSurveys()
    {
        var surveys = await surveysService.GetAllSurveysAsync();
        
        return Ok(surveys);
    }

    /// <summary>
    /// Получить доступные переходы статусов для опроса
    /// </summary>
    [HttpGet("{id}/status/transitions")]
    public async Task<ActionResult<SurveyStatusResponse>> GetStatusTransitions(int id)
    {
        var response = await surveysService.GetAvailableStatusTransitionsAsync(id);
    
        if (response.ErrorMessage != null && !response.AvailableTransitions.Any())
        {
            return BadRequest(response);
        }

    return Ok(response);
    }

    /// <summary>
    /// Изменить статус опроса
    /// </summary>
    [HttpPatch("{id:int}/status")]
    public async Task<ActionResult<SurveyStatusResponse>> ChangeStatus(int id, [FromBody] SurveyStatusRequest request)
    {
        try
        {
            await surveysService.ChangeSurveyStatusAsync(id, request.NewStatus);
        
            // Возвращаем обновлённую информацию о статусах
            var response = await surveysService.GetAvailableStatusTransitionsAsync(id);
            return Ok(response);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}