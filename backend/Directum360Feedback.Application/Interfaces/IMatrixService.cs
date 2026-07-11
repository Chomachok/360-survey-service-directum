using Directum360Feedback.Application.DTOs;

namespace Directum360Feedback.Application.Interfaces;

public interface IMatrixService
{
    Task<IEnumerable<MatrixItemDto>> GetMatrixForSurveyAsync(int surveyId);
    Task<MatrixItemDto> AddMatrixItemAsync(int surveyId, CreateMatrixItemDto dto);
    Task RemoveMatrixItemAsync(int assignmentId);
}