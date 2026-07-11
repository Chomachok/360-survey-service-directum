using Directum360Feedback.Application.DTOs;

namespace Directum360Feedback.Application.Interfaces;

public interface IResultService
{
    Task<ResultDto> GetSurveyResultsAsync(int surveyId);
    Task<byte[]> ExportDocxAsync(int surveyId);
}