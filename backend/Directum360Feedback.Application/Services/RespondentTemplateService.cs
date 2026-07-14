using AutoMapper;
using Directum360Feedback.Application.DTOs;
using Directum360Feedback.Application.Interfaces;
using Directum360Feedback.Domain.Entities;
using Directum360Feedback.Domain.Enums;
using Directum360Feedback.Infrastructure.Repositories;

namespace Directum360Feedback.Application.Services;

public class RespondentTemplateService(
    IRepository<RespondentTemplate> templateRepo,
    IRepository<RespondentTemplateItem> itemRepo,
    IRepository<Employee> employeeRepo,
    IRepository<Survey> surveyRepo,
    IRepository<SurveyAssignment> assignmentRepo,
    IMapper mapper)
    : IRespondentTemplateService
{
    private const string SelfLabel = "Сам оцениваемый";

    // ---------- чтение ----------

    public async Task<IEnumerable<RespondentTemplateDto>> GetAllAsync()
    {
        var templates = await templateRepo.FindAsync(t => true, t => t.Items);
        var employees = (await employeeRepo.GetAllAsync()).ToDictionary(e => e.Id, e => e.FullName);

        return templates
            .OrderBy(t => t.Name)
            .Select(t => ToDto(t, employees))
            .ToList();
    }

    public async Task<RespondentTemplateDto> GetByIdAsync(int id)
    {
        var template = await LoadWithItemsAsync(id);
        var employees = (await employeeRepo.GetAllAsync()).ToDictionary(e => e.Id, e => e.FullName);
        return ToDto(template, employees);
    }

    // ---------- CRUD ----------

    public async Task<RespondentTemplateDto> CreateAsync(CreateRespondentTemplateDto dto)
    {
        await ValidateAsync(dto.Name, dto.Items);

        var template = new RespondentTemplate
        {
            Name = dto.Name.Trim(),
            Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim(),
            Items = dto.Items
                .Select(i => new RespondentTemplateItem
                {
                    EmployeeId = i.Role == AssessmentRole.SelfAssessment ? null : i.EmployeeId,
                    Role = i.Role
                })
                .ToList()
        };

        await templateRepo.AddAsync(template);
        await templateRepo.SaveChangesAsync();

        return await GetByIdAsync(template.Id);
    }

    public async Task<RespondentTemplateDto> UpdateAsync(int id, UpdateRespondentTemplateDto dto)
    {
        var template = await LoadWithItemsAsync(id);
        await ValidateAsync(dto.Name, dto.Items);

        template.Name = dto.Name.Trim();
        template.Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim();

        // Состав перезаписываем целиком — так проще и предсказуемее, чем диффить.
        // Сущность уже отслеживается (загружена через FindAsync с Include), поэтому
        // достаточно менять коллекцию: DbSet.Update здесь не нужен и только мешал бы,
        // переводя удаляемых детей обратно в Modified.
        foreach (var old in template.Items.ToList())
        {
            template.Items.Remove(old);
            itemRepo.Delete(old);
        }

        foreach (var i in dto.Items)
        {
            template.Items.Add(new RespondentTemplateItem
            {
                TemplateId = template.Id,
                EmployeeId = i.Role == AssessmentRole.SelfAssessment ? null : i.EmployeeId,
                Role = i.Role
            });
        }

        await templateRepo.SaveChangesAsync();

        return await GetByIdAsync(template.Id);
    }

    public async Task DeleteAsync(int id)
    {
        var template = await templateRepo.GetByIdAsync(id)
                       ?? throw new Exception("Шаблон респондентов не найден");

        templateRepo.Delete(template);
        await templateRepo.SaveChangesAsync();
    }

    // ---------- применение к опросу ----------

    public async Task<ApplyRespondentTemplateResultDto> ApplyToSurveyAsync(int surveyId, ApplyRespondentTemplateDto dto)
    {
        var survey = await surveyRepo.GetByIdAsync(surveyId)
                     ?? throw new Exception("Опрос не найден");

        if (survey.Status != SurveyStatus.Draft)
            throw new Exception("Добавление участников доступно только для опросов в статусе «Черновик»");

        // оцениваемый теперь задаётся на уровне опроса
        if (survey.TargetId is null)
            throw new Exception("Для опроса не указан оцениваемый сотрудник — задайте его в настройках опроса");

        var target = await employeeRepo.GetByIdAsync(survey.TargetId.Value)
                     ?? throw new Exception("Оцениваемый сотрудник не найден");

        var template = await LoadWithItemsAsync(dto.TemplateId);

        if (template.Items.Count == 0)
            throw new Exception("Шаблон пуст — добавьте в него хотя бы одного респондента");

        // уже существующие связи этого опроса, чтобы не плодить дубли
        var existing = (await assignmentRepo.FindAsync(a => a.SurveyId == surveyId))
            .Select(a => (a.EvaluatorId, a.TargetId, a.Role))
            .ToHashSet();

        var result = new ApplyRespondentTemplateResultDto();

        foreach (var item in template.Items)
        {
            // для самооценки оценивающий и есть оцениваемый
            if (item.Role != AssessmentRole.SelfAssessment && item.EmployeeId is null)
                throw new Exception($"Шаблон «{template.Name}» повреждён: у респондента с ролью {item.Role} не указан сотрудник");

            var evaluatorId = item.Role == AssessmentRole.SelfAssessment
                ? target.Id
                : item.EmployeeId!.Value;

            var key = (evaluatorId, target.Id, item.Role);
            if (!existing.Add(key))
            {
                result.Skipped++;
                continue;
            }

            var assignment = new SurveyAssignment
            {
                SurveyId = surveyId,
                EvaluatorId = evaluatorId,
                TargetId = target.Id,
                Role = item.Role,
                Token = Guid.NewGuid().ToString(),
                InviteSent = false
            };

            await assignmentRepo.AddAsync(assignment);
            result.Items.Add(new MatrixItemDto
            {
                EvaluatorId = evaluatorId,
                TargetId = target.Id,
                Role = item.Role,
                TargetName = target.FullName,
                EvaluatorName = evaluatorId == target.Id
                    ? target.FullName
                    : (await employeeRepo.GetByIdAsync(evaluatorId))?.FullName ?? "Unknown",
                Token = assignment.Token,
                Completed = false
            });
            result.Created++;
        }

        if (result.Created > 0)
            await assignmentRepo.SaveChangesAsync();

        return result;
    }

    // ---------- сохранение вручную набранной матрицы как шаблона ----------

    public async Task<RespondentTemplateDto> CreateFromSurveyAsync(CreateTemplateFromSurveyDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            throw new Exception("Укажите название шаблона");

        var survey = await surveyRepo.GetByIdAsync(dto.SurveyId)
                     ?? throw new Exception("Опрос не найден");

        if (survey.TargetId is null)
            throw new Exception("Для опроса не указан оцениваемый сотрудник");

        var targetId = survey.TargetId.Value;

        var assignments = (await assignmentRepo.FindAsync(
                a => a.SurveyId == dto.SurveyId && a.TargetId == targetId))
            .ToList();

        if (assignments.Count == 0)
            throw new Exception("В матрице опроса пока нет ни одной связи — сохранять нечего");

        var template = new RespondentTemplate
        {
            Name = dto.Name.Trim(),
            Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim(),
            Items = assignments
                .Select(a => new RespondentTemplateItem
                {
                    // самооценку сохраняем как «сам оцениваемый», чтобы шаблон остался переносимым
                    EmployeeId = a.Role == AssessmentRole.SelfAssessment || a.EvaluatorId == a.TargetId
                        ? null
                        : a.EvaluatorId,
                    Role = a.Role
                })
                .ToList()
        };

        await templateRepo.AddAsync(template);
        await templateRepo.SaveChangesAsync();

        return await GetByIdAsync(template.Id);
    }

    // ---------- вспомогательное ----------

    private async Task<RespondentTemplate> LoadWithItemsAsync(int id)
    {
        var template = (await templateRepo.FindAsync(t => t.Id == id, t => t.Items)).FirstOrDefault();
        return template ?? throw new Exception("Шаблон респондентов не найден");
    }

    private async Task ValidateAsync(string name, List<CreateRespondentTemplateItemDto> items)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new Exception("Укажите название шаблона");

        if (items.Count == 0)
            throw new Exception("Добавьте в шаблон хотя бы одного респондента");

        if (items.Count(i => i.Role == AssessmentRole.SelfAssessment) > 1)
            throw new Exception("Самооценка может быть в шаблоне только одна");

        foreach (var item in items)
        {
            if (item.Role == AssessmentRole.SelfAssessment)
                continue;

            if (item.EmployeeId is null)
                throw new Exception("У каждого респондента, кроме самооценки, должен быть выбран сотрудник");

            if (await employeeRepo.GetByIdAsync(item.EmployeeId.Value) is null)
                throw new Exception($"Сотрудник с id={item.EmployeeId} не найден");
        }

        // один и тот же сотрудник в одной и той же роли дважды — почти наверняка ошибка
        var duplicate = items
            .Where(i => i.Role != AssessmentRole.SelfAssessment)
            .GroupBy(i => new { i.EmployeeId, i.Role })
            .FirstOrDefault(g => g.Count() > 1);

        if (duplicate != null)
            throw new Exception("В шаблоне есть повторяющийся респондент с той же ролью");
    }

    private RespondentTemplateDto ToDto(RespondentTemplate t, IReadOnlyDictionary<int, string> employees)
    {
        var dto = mapper.Map<RespondentTemplateDto>(t);
        dto.Items = t.Items
            .Select(i => new RespondentTemplateItemDto
            {
                Id = i.Id,
                EmployeeId = i.EmployeeId,
                Role = i.Role,
                EmployeeName = i.EmployeeId is null
                    ? SelfLabel
                    : employees.TryGetValue(i.EmployeeId.Value, out var n) ? n : "Unknown"
            })
            .OrderBy(i => i.Role)
            .ThenBy(i => i.EmployeeName)
            .ToList();
        return dto;
    }
}
