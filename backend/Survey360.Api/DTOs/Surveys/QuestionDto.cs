using Survey360.Api.Enums;

namespace Survey360.Api.DTOs.Surveys;

public record QuestionDto(
    int Id,
    string Text,
    QuestionType Type,
    List<string> Options
);