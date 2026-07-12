using Directum360Feedback.Application.DTOs.ResultDTOs;

namespace Directum360Feedback.Application.Interfaces;

public interface IResultService
{
    Task<ResultDto> GetSurveyResultsAsync(int surveyId);
    Task<byte[]> ExportDocxAsync(int surveyId);
}