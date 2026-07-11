using Directum360Feedback.Application.DTOs;

namespace Directum360Feedback.Application.Interfaces;

public interface IPublicService
{
    Task<PublicSurveyDto?> GetSurveyByTokenAsync(string token);
    Task SubmitAnswersAsync(string token, SubmitAnswersDto dto);
}