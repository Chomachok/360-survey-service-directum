namespace Directum360Feedback.Application.DTOs;

public class ApplyRespondentTemplateResultDto
{
    public int Created { get; set; }
    /// <summary>Сколько связей пропущено, потому что уже были в матрице</summary>
    public int Skipped { get; set; }
    public List<MatrixItemDto> Items { get; set; } = new();
}
