namespace Directum360Feedback.Application.DTOs.RespondentTemplateDTOs;

/// <summary>
/// Применить шаблон респондентов к опросу.
///
/// Если TargetIds не передан (пуст) — используются оцениваемые, зашитые в сам шаблон
/// (Template.Targets). Если и там пусто — нужно передать TargetIds явно (для
/// «универсальных» шаблонов, где оцениваемый выбирается вручную при применении).
/// Если TargetIds передан — он имеет приоритет над зашитыми в шаблон целями.
/// </summary>
public class ApplyRespondentTemplateDto
{
    public int TemplateId { get; set; }
    public List<int> TargetIds { get; set; } = new();
}
