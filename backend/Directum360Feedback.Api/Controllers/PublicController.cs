using Microsoft.AspNetCore.Mvc;
using Directum360Feedback.Application.DTOs;
using Directum360Feedback.Application.Interfaces;

namespace Directum360Feedback.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PublicController : ControllerBase
{
    private readonly IPublicService _publicService;

    public PublicController(IPublicService publicService)
    {
        _publicService = publicService;
    }

    [HttpGet("{token}")]
    public async Task<IActionResult> GetSurvey(string token)
    {
        try
        {
            var survey = await _publicService.GetSurveyByTokenAsync(token);
            return Ok(survey);
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("{token}/answers")]
    public async Task<IActionResult> SubmitAnswers(string token, SubmitAnswersDto dto)
    {
        try
        {
            await _publicService.SubmitAnswersAsync(token, dto);
            return Ok();
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }
}