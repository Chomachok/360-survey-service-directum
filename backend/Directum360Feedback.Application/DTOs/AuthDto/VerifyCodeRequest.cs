namespace Directum360Feedback.Application.DTOs.AuthDto;

public class VerifyCodeRequest
{
    public string Email { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
}