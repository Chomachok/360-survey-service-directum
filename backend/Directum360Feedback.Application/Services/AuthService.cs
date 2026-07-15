using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Directum360Feedback.Application.DTOs.AuthDto;
using Directum360Feedback.Application.Interfaces;
using Directum360Feedback.Domain.Entities;
using Directum360Feedback.Domain.Settings;
using Directum360Feedback.Infrastructure.Repositories;
using Microsoft.Extensions.Configuration;

namespace Directum360Feedback.Application.Services;

public class AuthService(
    IRepository<Employee> employeeRepo,
    IRepository<OneTimeCode> codeRepo,
    IEmailService emailService,
    IOptions<JwtSettings> jwtSettings,
    IConfiguration configuration)
    : IAuthService
{
    private readonly JwtSettings _jwtSettings = jwtSettings.Value;
    private readonly string _baseUrl = configuration["BaseUrl"] ?? "http://localhost:5173";

    public async Task SendCodeAsync(string email)
    {
        var employee = (await employeeRepo.FindAsync(e => e.Email == email)).FirstOrDefault();
        if (employee == null)
            throw new Exception("Пользователь с таким email не найден");

        // Генерируем 6-значный код
        var code = new Random().Next(100000, 999999).ToString();

        // Удаляем старые неиспользованные коды для этого email
        var oldCodes = await codeRepo.FindAsync(c => c.Email == email && !c.IsUsed);
        foreach (var old in oldCodes)
            codeRepo.Delete(old);
        await codeRepo.SaveChangesAsync();

        var oneTimeCode = new OneTimeCode
        {
            Email = email,
            Code = code,
            ExpiresAt = DateTime.UtcNow.AddMinutes(15),
            IsUsed = false
        };
        await codeRepo.AddAsync(oneTimeCode);
        await codeRepo.SaveChangesAsync();

        // Отправляем код на email
        var subject = "Код для входа в Directum360";
        var body = $@"
            <h2>Здравствуйте, {employee.FullName}!</h2>
            <p>Ваш одноразовый код для входа в систему:</p>
            <h1 style='font-size: 36px; color: #FF8600;'>{code}</h1>
            <p>Код действителен в течение 15 минут.</p>
            <p>Если вы не запрашивали вход, проигнорируйте это письмо.</p>
        ";
        await emailService.SendEmailAsync(employee.Email, subject, body);
    }

    public async Task<AuthResponse> VerifyCodeAsync(string email, string code)
    {
        var employee = (await employeeRepo.FindAsync(e => e.Email == email)).FirstOrDefault();
        if (employee == null)
            throw new Exception("Пользователь не найден");

        var oneTimeCode = (await codeRepo.FindAsync(c => c.Email == email && c.Code == code && !c.IsUsed)).FirstOrDefault();
        if (oneTimeCode == null)
            throw new Exception("Неверный или уже использованный код");

        if (oneTimeCode.ExpiresAt < DateTime.UtcNow)
            throw new Exception("Код истёк");

        // Помечаем код как использованный
        oneTimeCode.IsUsed = true;
        codeRepo.Update(oneTimeCode);
        await codeRepo.SaveChangesAsync();

        // Генерируем JWT
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.UTF8.GetBytes(_jwtSettings.Secret);
        var claims = new List<Claim>
        {
            new(ClaimTypes.Email, employee.Email),
            new(ClaimTypes.Name, employee.FullName),
            new("IsAdmin", employee.IsAdmin.ToString().ToLower()),
            new(ClaimTypes.NameIdentifier, employee.Id.ToString())
        };

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddMinutes(_jwtSettings.ExpiryMinutes),
            Issuer = _jwtSettings.Issuer,
            Audience = _jwtSettings.Audience,
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        var tokenString = tokenHandler.WriteToken(token);

        return new AuthResponse
        {
            Token = tokenString,
            FullName = employee.FullName,
            IsAdmin = employee.IsAdmin,
            Email = employee.Email
        };
    }
}