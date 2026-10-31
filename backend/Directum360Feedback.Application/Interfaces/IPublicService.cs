using Directum360Feedback.Application.DTOs;

namespace Directum360Feedback.Application.Interfaces;

public interface IPublicService
{
    Task<PublicSurveyDto?> GetSurveyByTokenAsync(string token, int currentlyEmployeeId);
    Task SubmitAnswersAsync(string token, int currentEmployeeId, SubmitAnswersDto dto);
}