using AutoMapper;
using Directum360Feedback.Application.DTOs;
using Directum360Feedback.Application.DTOs.SurveyTemplateDTOs;
using Directum360Feedback.Domain.Entities;

namespace Directum360Feedback.Application.Mappings;

public class MappingProfile : Profile
{
    public MappingProfile()
    {
        // Существующие маппинги
        CreateMap<Survey, SurveyDto>();
        CreateMap<CreateSurveyDto, Survey>();
        CreateMap<UpdateSurveyDto, Survey>();
        CreateMap<SurveyQuestion, QuestionDto>()
            .ForMember(dest => dest.Options, opt => opt.Ignore());
        CreateMap<CreateQuestionDto, SurveyQuestion>();
        CreateMap<QuestionTemplate, QuestionTemplateDto>()
            .ForMember(dest => dest.Options, opt => opt.Ignore());
        CreateMap<CreateQuestionTemplateDto, QuestionTemplate>();
        CreateMap<SurveyAssignment, MatrixItemDto>();
        CreateMap<CreateMatrixItemDto, SurveyAssignment>();
        CreateMap<Employee, EmployeeDto>();

        CreateMap<SurveyTemplate, SurveyTemplateDto>()
            .ForMember(dest => dest.Questions, opt => opt.Ignore()); // заполняем вручную в сервисе

        CreateMap<SurveyTemplateQuestion, TemplateQuestionDto>()
            .ForMember(dest => dest.Options, opt => opt.Ignore()); // десериализуем в сервисе

        CreateMap<CreateSurveyTemplateDto, SurveyTemplate>()
            .ForMember(dest => dest.Questions, opt => opt.Ignore()); // добавляем отдельно

        CreateMap<CreateTemplateQuestionDto, SurveyTemplateQuestion>()
            .ForMember(dest => dest.Options, opt => opt.Ignore()); // сериализуем в сервисе

        CreateMap<UpdateSurveyTemplateDto, SurveyTemplate>()
            .ForMember(dest => dest.Questions, opt => opt.Ignore());
    }
}