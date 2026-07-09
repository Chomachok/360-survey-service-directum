namespace Survey360.Api.DTOs.Answers;

public record AnswerSubmitRequest(int AssignmentId, int QuestionId, string Text);