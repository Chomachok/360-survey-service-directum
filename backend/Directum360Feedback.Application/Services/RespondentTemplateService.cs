using AutoMapper;
using Directum360Feedback.Application.DTOs;
using Directum360Feedback.Application.DTOs.RespondentTemplateDTOs;
using Directum360Feedback.Application.Interfaces;
using Directum360Feedback.Domain.Entities;
using Directum360Feedback.Domain.Enums;
using Directum360Feedback.Infrastructure.Repositories;

namespace Directum360Feedback.Application.Services;

public class RespondentTemplateService(
    IRepository<RespondentTemplate> templateRepo,
    IRepository<RespondentTemplateItem> itemRepo,
    IRepository<RespondentTemplateTarget> targetRepo,
    IRepository<Employee> employeeRepo,
    IRepository<Survey> surveyRepo,
    IRepository<SurveyAssignment> assignmentRepo,
    IMapper mapper)
    : IRespondentTemplateService
{
    // ---------- чтение ----------

    public async Task<IEnumerable<RespondentTemplateDto>> GetAllAsync()
    {
        var templates = await templateRepo.FindAsync(t => true, t => t.Items, t => t.Targets);
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
        var targetIds = await ValidateTargetsAsync(dto.TargetEmployeeIds);

        var template = new RespondentTemplate
        {
            Name = dto.Name.Trim(),
            Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim(),
            Items = dto.Items
                .Select(i => new RespondentTemplateItem
                {
                    EmployeeId = i.EmployeeId
                })
                .ToList(),
            Targets = targetIds
                .Select(id => new RespondentTemplateTarget
                {
                    EmployeeId = id
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
        var targetIds = await ValidateTargetsAsync(dto.TargetEmployeeIds);

        template.Name = dto.Name.Trim();
        template.Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim();

        // Перезаписываем состав целиком
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
                EmployeeId = i.EmployeeId,
            });
        }

        // Перезаписываем оцениваемых целиком
        foreach (var old in template.Targets.ToList())
        {
            template.Targets.Remove(old);
            targetRepo.Delete(old);
        }

        foreach (var employeeId in targetIds)
        {
            template.Targets.Add(new RespondentTemplateTarget
            {
                TemplateId = template.Id,
                EmployeeId = employeeId,
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
        // Валидация опроса
        var survey = await surveyRepo.GetByIdAsync(surveyId)
                     ?? throw new Exception("Опрос не найден");

        if (survey.Status != SurveyStatus.Draft)
            throw new Exception("Добавление участников доступно только для опросов в статусе «Черновик»");

        // Валидация шаблона
        var template = await LoadWithItemsAsync(dto.TemplateId);

        if (template.Items.Count == 0)
            throw new Exception("Шаблон пуст — добавьте в него хотя бы одного оценивающего");

        // Валидация элементов шаблона
        foreach (var item in template.Items)
        {
            if (item.EmployeeId is null)
                throw new Exception($"Шаблон «{template.Name}» повреждён: у оценивающего не указан сотрудник");

            var employee = await employeeRepo.GetByIdAsync(item.EmployeeId.Value);
            if (employee is null)
                throw new Exception($"Оценивающий сотрудник (id={item.EmployeeId}) не найден в системе");
        }

        // Определяем целевых сотрудников
        // Приоритет: явно переданные TargetIds > оцениваемые, зашитые в шаблон.
        var targetIds = (dto.TargetIds?.Count > 0
                ? dto.TargetIds
                : template.Targets.Select(t => t.EmployeeId))
            .Distinct()
            .ToList();

        if (targetIds.Count == 0)
            throw new Exception("Не указан оцениваемый: выберите сотрудника вручную или задайте оцениваемых в самом шаблоне");

        // Валидация целевых сотрудников
        var targets = new List<Employee>();
        foreach (var targetId in targetIds)
        {
            var target = await employeeRepo.GetByIdAsync(targetId)
                         ?? throw new Exception($"Оцениваемый сотрудник (id={targetId}) не найден в системе");
            targets.Add(target);
        }

        // Получаем существующие связи этого опроса
        var existing = (await assignmentRepo.FindAsync(a => a.SurveyId == surveyId))
            .Select(a => (a.EvaluatorId, a.TargetId))
            .ToHashSet();

        var result = new ApplyRespondentTemplateResultDto();

        // Применяем шаблон к каждому целевому сотруднику
        foreach (var target in targets)
        {
            foreach (var item in template.Items)
            {
                var evaluatorId = item.EmployeeId!.Value;

                var key = (evaluatorId, target.Id);
                if (existing.Contains(key))
                {
                    result.Skipped++;
                    continue;
                }

                // Проверяем, что оценивающий не оценивает сам себя
                if (evaluatorId == target.Id)
                {
                    result.Skipped++;
                    continue;
                }

                var assignment = new SurveyAssignment
                {
                    SurveyId = surveyId,
                    EvaluatorId = evaluatorId,
                    TargetId = target.Id,
                    Token = Guid.NewGuid().ToString(),
                    InviteSent = false
                };

                await assignmentRepo.AddAsync(assignment);
                
                var evaluatorEmployee = await employeeRepo.GetByIdAsync(evaluatorId);
                result.Items.Add(new MatrixItemDto
                {
                    EvaluatorId = evaluatorId,
                    TargetId = target.Id,
                    TargetName = target.FullName,
                    EvaluatorName = evaluatorEmployee?.FullName ?? "Unknown",
                    Token = assignment.Token,
                    Completed = false
                });
                result.Created++;
                existing.Add(key);
            }
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
                    EmployeeId = a.EvaluatorId
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
        var template = (await templateRepo.FindAsync(t => t.Id == id, t => t.Items, t => t.Targets)).FirstOrDefault();
        return template ?? throw new Exception("Шаблон респондентов не найден");
    }

    private async Task ValidateAsync(string name, List<CreateRespondentTemplateItemDto> items)
    {
        // Валидация названия
        if (string.IsNullOrWhiteSpace(name))
            throw new Exception("Укажите название шаблона");

        if (name.Length > 255)
            throw new Exception("Название шаблона не должно быть длиннее 255 символов");

        // Валидация количества элементов
        if (items.Count == 0)
            throw new Exception("Добавьте в шаблон хотя бы одного оценивающего");

        // Валидация каждого элемента
        foreach (var item in items)
        {
            if (item.EmployeeId is null || item.EmployeeId == -1)
                throw new Exception("У каждого оценивающего должен быть выбран сотрудник");

            var employee = await employeeRepo.GetByIdAsync(item.EmployeeId.Value);
            if (employee is null)
                throw new Exception($"Сотрудник с id={item.EmployeeId} не найден в системе");
        }

        // Проверка на дублирование оценивающих
        var validIds = items
            .Where(i => i.EmployeeId.HasValue && i.EmployeeId != -1)
            .Select(i => i.EmployeeId!.Value)
            .ToList();

        var duplicateEvaluators = validIds
            .GroupBy(id => id)
            .Where(g => g.Count() > 1)
            .Select(g => g.Key)
            .ToList();

        if (duplicateEvaluators.Count > 0)
        {
            var duplicateNames = string.Join(", ", duplicateEvaluators);
            throw new Exception($"В шаблоне есть повторяющиеся оценивающие (id: {duplicateNames})");
        }
    }

    /// <summary>Проверяет и нормализует список оцениваемых, зашитых в шаблон (может быть пустым).</summary>
    private async Task<List<int>> ValidateTargetsAsync(List<int> targetEmployeeIds)
    {
        if (targetEmployeeIds == null)
            return new List<int>();

        var ids = targetEmployeeIds
            .Where(id => id > 0)
            .Distinct()
            .ToList();

        // Валидация каждого целевого сотрудника
        foreach (var id in ids)
        {
            var employee = await employeeRepo.GetByIdAsync(id);
            if (employee is null)
                throw new Exception($"Оцениваемый сотрудник с id={id} не найден в системе");
        }

        // Проверка на дублирование
        var duplicateTargets = ids
            .GroupBy(id => id)
            .Where(g => g.Count() > 1)
            .Select(g => g.Key)
            .ToList();

        if (duplicateTargets.Count > 0)
        {
            var duplicateNames = string.Join(", ", duplicateTargets);
            throw new Exception($"В списке оцениваемых есть дубликаты (id: {duplicateNames})");
        }

        return ids;
    }

    private RespondentTemplateDto ToDto(RespondentTemplate t, IReadOnlyDictionary<int, string> employees)
    {
        var dto = mapper.Map<RespondentTemplateDto>(t);
        dto.Items = t.Items
            .Select(i => new RespondentTemplateItemDto
            {
                Id = i.Id,
                EmployeeId = i.EmployeeId,
                EmployeeName = i.EmployeeId is null
                    ? "Неизвестно"
                    : employees.TryGetValue(i.EmployeeId.Value, out var n) ? n : "Unknown"
            })
            .OrderBy(i => i.EmployeeName)
            .ToList();
        dto.Targets = t.Targets
            .Select(target => new RespondentTemplateTargetDto
            {
                Id = target.Id,
                EmployeeId = target.EmployeeId,
                EmployeeName = employees.TryGetValue(target.EmployeeId, out var n) ? n : "Unknown"
            })
            .OrderBy(target => target.EmployeeName)
            .ToList();
        return dto;
    }
}
