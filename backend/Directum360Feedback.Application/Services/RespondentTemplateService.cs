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
    IRepository<Employee> employeeRepo,
    IRepository<Survey> surveyRepo,
    IRepository<SurveyAssignment> assignmentRepo,
    IMapper mapper)
    : IRespondentTemplateService
{
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
                    EmployeeId = i.EmployeeId
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

        var target = await employeeRepo.GetByIdAsync(dto.TargetId)
                     ?? throw new Exception("Оцениваемый сотрудник не найден");

        var template = await LoadWithItemsAsync(dto.TemplateId);

        if (template.Items.Count == 0)
            throw new Exception("Шаблон пуст — добавьте в него хотя бы одного респондента");

        // уже существующие связи этого опроса (EvaluatorId, TargetId)
        var existing = (await assignmentRepo.FindAsync(a => a.SurveyId == surveyId))
            .Select(a => (a.EvaluatorId, a.TargetId))
            .ToHashSet();

        var result = new ApplyRespondentTemplateResultDto();

        foreach (var item in template.Items)
        {
            if (item.EmployeeId is null)
                throw new Exception($"Шаблон «{template.Name}» повреждён: у респондента не указан сотрудник");

            var evaluatorId = item.EmployeeId.Value;

            var key = (evaluatorId, target.Id);
            if (existing.Contains(key))
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
            result.Items.Add(new MatrixItemDto
            {
                EvaluatorId = evaluatorId,
                TargetId = target.Id,
                TargetName = target.FullName,
                EvaluatorName = evaluatorId == target.Id
                    ? target.FullName
                    : (await employeeRepo.GetByIdAsync(evaluatorId))?.FullName ?? "Unknown",
                Token = assignment.Token,
                Completed = false
            });
            result.Created++;
            existing.Add(key);
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
        var template = (await templateRepo.FindAsync(t => t.Id == id, t => t.Items)).FirstOrDefault();
        return template ?? throw new Exception("Шаблон респондентов не найден");
    }

    private async Task ValidateAsync(string name, List<CreateRespondentTemplateItemDto> items)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new Exception("Укажите название шаблона");

        if (items.Count == 0)
            throw new Exception("Добавьте в шаблон хотя бы одного респондента");

        foreach (var item in items)
        {
            if (item.EmployeeId is null)
                throw new Exception("У каждого респондента должен быть выбран сотрудник");

            if (await employeeRepo.GetByIdAsync(item.EmployeeId.Value) is null)
                throw new Exception($"Сотрудник с id={item.EmployeeId} не найден");
        }

        // Проверка дублирования одного и того же сотрудника в шаблоне
        var duplicate = items
            .GroupBy(i => i.EmployeeId)
            .FirstOrDefault(g => g.Count() > 1);

        if (duplicate != null)
            throw new Exception("В шаблоне есть повторяющийся респондент");
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
        return dto;
    }
}