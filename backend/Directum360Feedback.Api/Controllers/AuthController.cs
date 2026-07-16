using Microsoft.AspNetCore.Mvc;
using Directum360Feedback.Application.DTOs.AuthDto;
using Directum360Feedback.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;

namespace Directum360Feedback.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[AllowAnonymous]
public class AuthController(IAuthService authService) : ControllerBase
{
    [HttpPost("send-code")]
    public async Task<IActionResult> SendCode([FromBody] SendCodeRequest request)
    {
        try
        {
            await authService.SendCodeAsync(request.Email);
            return Ok(new { message = "Код отправлен на email" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("verify")]
    public async Task<IActionResult> Verify([FromBody] VerifyCodeRequest request)
    {
        try
        {
            var response = await authService.VerifyCodeAsync(request.Email, request.Code);
            return Ok(response);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}