namespace Survey360.Api.DTOs.Templates;

public record TemplateCreateRequest(string Title, List<string> QuestionTexts);