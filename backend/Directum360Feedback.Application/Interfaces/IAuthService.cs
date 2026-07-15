using Directum360Feedback.Application.DTOs.AuthDto;

namespace Directum360Feedback.Application.Interfaces;

public interface IAuthService
{
    Task SendCodeAsync(string email);
    Task<AuthResponse> VerifyCodeAsync(string email, string code);
}