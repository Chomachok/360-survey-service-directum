using Survey360.Api.Enums;

namespace Survey360.Api.DTOs.Templates;

public record QuestionRequestDto(
    string Text,
    QuestionType Type,
    List<string>? Options
);