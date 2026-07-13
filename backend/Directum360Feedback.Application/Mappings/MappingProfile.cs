using AutoMapper;
using Directum360Feedback.Application.DTOs;
using Directum360Feedback.Domain.Entities;

namespace Directum360Feedback.Application.Mappings;

public class MappingProfile : Profile
{
    public MappingProfile()
    {
        CreateMap<Survey, SurveyDto>();
        CreateMap<CreateSurveyDto, Survey>();
        CreateMap<UpdateSurveyDto, Survey>();

        // Игнорируем Options, потому что мы заполняем его вручную из JSON
        CreateMap<SurveyQuestion, QuestionDto>()
            .ForMember(dest => dest.Options, opt => opt.Ignore());

        CreateMap<CreateQuestionDto, SurveyQuestion>();

        CreateMap<QuestionTemplate, QuestionTemplateDto>()
            .ForMember(dest => dest.Options, opt => opt.Ignore());

        CreateMap<CreateQuestionTemplateDto, QuestionTemplate>();

        CreateMap<SurveyAssignment, MatrixItemDto>();
        CreateMap<CreateMatrixItemDto, SurveyAssignment>();
        CreateMap<Employee, EmployeeDto>();

        // Items заполняем вручную в сервисе (нужны имена сотрудников и подпись «Сам оцениваемый»)
        CreateMap<RespondentTemplate, RespondentTemplateDto>()
            .ForMember(dest => dest.Items, opt => opt.Ignore());
    }
}