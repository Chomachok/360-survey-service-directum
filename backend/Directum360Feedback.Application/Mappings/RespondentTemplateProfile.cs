using AutoMapper;
using Directum360Feedback.Application.DTOs;
using Directum360Feedback.Application.DTOs.RespondentTemplateDTOs;
using Directum360Feedback.Domain.Entities;

namespace Directum360Feedback.Application.Mappings;

/// <summary>
/// Маппинги фичи «Шаблоны респондентов».
/// Вынесены в отдельный профиль, чтобы не трогать общий MappingProfile:
/// AddAutoMapper(typeof(DependencyInjection)) сканирует сборку и подхватит его сам.
/// </summary>
public class RespondentTemplateProfile : Profile
{
    public RespondentTemplateProfile()
    {
        // Items заполняем вручную в сервисе — нужны имена сотрудников и подпись «Сам оцениваемый»
        CreateMap<RespondentTemplate, RespondentTemplateDto>()
            .ForMember(dest => dest.Items, opt => opt.Ignore());
    }
}
