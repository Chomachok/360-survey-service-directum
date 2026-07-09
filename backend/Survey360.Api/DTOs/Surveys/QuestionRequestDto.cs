using Survey360.Api.Enums;

namespace Survey360.Api.DTOs.Surveys;

public record QuestionRequestDto(
    string Text,
    QuestionType Type,
    List<string>? Options);