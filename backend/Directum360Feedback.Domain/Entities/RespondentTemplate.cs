namespace Directum360Feedback.Domain.Entities;

/// <summary>
/// Предопределённый список респондентов (оценивающих) для опроса 360.
/// По умолчанию шаблон не привязан к конкретному оцениваемому: администратор один раз описывает
/// состав («руководитель — Петров, коллеги — Иванова и Александрова, плюс самооценка»),
/// а затем применяет его к любому сотруднику, которого нужно оценить.
///
/// Если в шаблоне заданы Targets — шаблон становится «привязанным»: при применении
/// он сразу создаёт связи для всех перечисленных там оцениваемых (например,
/// для целого отдела с одинаковым составом оценивающих).
/// </summary>
public class RespondentTemplate : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public ICollection<RespondentTemplateItem> Items { get; set; } = new List<RespondentTemplateItem>();
    public ICollection<RespondentTemplateTarget> Targets { get; set; } = new List<RespondentTemplateTarget>();
}
