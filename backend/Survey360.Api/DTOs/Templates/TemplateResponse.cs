namespace Survey360.Api.DTOs.Templates;

public record TemplateResponse(int Id, string Title, List<TemplateQuestionDto> Questions);