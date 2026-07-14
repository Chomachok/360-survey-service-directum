using Directum360Feedback.Application.DTOs.SurveyTemplateDTOs;

namespace Directum360Feedback.Application.Interfaces;

public interface ISurveyTemplateService
{
    Task<IEnumerable<SurveyTemplateDto>> GetAllAsync();
    Task<SurveyTemplateDto?> GetByIdAsync(int id);
    Task<SurveyTemplateDto> CreateAsync(CreateSurveyTemplateDto dto);
    Task<SurveyTemplateDto> UpdateAsync(int id, UpdateSurveyTemplateDto dto);
    Task DeleteAsync(int id);
}