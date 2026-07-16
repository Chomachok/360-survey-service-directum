using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Directum360Feedback.Application.Interfaces;
using System.Security.Claims;

namespace Directum360Feedback.Api.Controllers;

[ApiController]
[Route("api/user")]
[Authorize]
public class UserController(ISurveyService surveyService) : ControllerBase
{
    [HttpGet("surveys")]
    public async Task<IActionResult> GetMySurveys()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var surveys = await surveyService.GetUserSurveysAsync(userId);
        return Ok(surveys);
    }
}