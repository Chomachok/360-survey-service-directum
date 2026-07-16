using Directum360Feedback.Application.DTOs;
using Directum360Feedback.Application.DTOs.RespondentTemplateDTOs;

namespace Directum360Feedback.Application.Interfaces;

public interface IRespondentTemplateService
{
    Task<IEnumerable<RespondentTemplateDto>> GetAllAsync();
    Task<RespondentTemplateDto> GetByIdAsync(int id);
    Task<RespondentTemplateDto> CreateAsync(CreateRespondentTemplateDto dto);
    Task<RespondentTemplateDto> UpdateAsync(int id, UpdateRespondentTemplateDto dto);
    Task DeleteAsync(int id);

    /// <summary>Развернуть шаблон в матрицу опроса для конкретного оцениваемого</summary>
    Task<ApplyRespondentTemplateResultDto> ApplyToSurveyAsync(int surveyId, ApplyRespondentTemplateDto dto);

    /// <summary>Собрать шаблон из уже набранной вручную матрицы опроса</summary>
    Task<RespondentTemplateDto> CreateFromSurveyAsync(CreateTemplateFromSurveyDto dto);
}
