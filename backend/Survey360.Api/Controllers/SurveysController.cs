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
}