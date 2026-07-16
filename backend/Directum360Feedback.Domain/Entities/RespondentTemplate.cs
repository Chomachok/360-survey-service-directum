namespace Directum360Feedback.Domain.Entities;

/// <summary>
/// Предопределённый список респондентов (оценивающих) для опроса 360.
/// Шаблон не привязан к конкретному оцениваемому: администратор один раз описывает
/// состав («руководитель — Петров, коллеги — Иванова и Александрова, плюс самооценка»),
/// а затем применяет его к любому сотруднику, которого нужно оценить.
/// </summary>
public class RespondentTemplate : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public ICollection<RespondentTemplateItem> Items { get; set; } = new List<RespondentTemplateItem>();
}
