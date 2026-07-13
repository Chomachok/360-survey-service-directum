using AutoMapper;
using Directum360Feedback.Application.DTOs;
using Directum360Feedback.Domain.Entities;

namespace Directum360Feedback.Application.Mappings;

public class MappingProfile : Profile
{
    public MappingProfile()
    {
        CreateMap<Survey, SurveyDto>()
            .ForMember(dest => dest.AuthorName, opt => opt.Ignore()) // AuthorName заполняется вручную в сервисе
            .ForMember(dest => dest.TargetId, opt => opt.MapFrom(src => src.TargetId)); // явно
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
        CreateMap<CreateSurveyDto, Survey>();
        CreateMap<UpdateSurveyDto, Survey>();
    }
}