namespace Directum360Feedback.Application.DTOs.AuthDto;

public class AuthResponse
{
    public string Token { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public bool IsAdmin { get; set; }
    public string Email { get; set; } = string.Empty;
}