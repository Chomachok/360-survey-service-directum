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

        CreateMap<SurveyTemplate, SurveyTemplateDto>();
        CreateMap<SurveyTemplateQuestion, TemplateQuestionDto>()
            .ForMember(dest => dest.Options, opt => opt.Ignore());
        CreateMap<CreateSurveyTemplateDto, SurveyTemplate>();
        CreateMap<CreateTemplateQuestionDto, SurveyTemplateQuestion>();
        CreateMap<UpdateSurveyTemplateDto, SurveyTemplate>();
    }
}