using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Directum360Feedback.Application.DTOs;
using Directum360Feedback.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;

namespace Directum360Feedback.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
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
            var employeeId = GetEmployeeId();
            var survey = await _publicService.GetSurveyByTokenAsync(token, employeeId);
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
            var employeeId = GetEmployeeId();
            await _publicService.SubmitAnswersAsync(token, employeeId, dto);
            return Ok();
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    private int GetEmployeeId()
    {
        int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var employeeId);
        return employeeId;
    }
}