using System.Globalization;
using AutoMapper;
using CsvHelper;
using Directum360Feedback.Application.DTOs.EmployeeDTOs;
using Directum360Feedback.Application.Interfaces;
using Directum360Feedback.Application.Validators;
using Directum360Feedback.Domain.Entities;
using Directum360Feedback.Domain.Enums;
using Directum360Feedback.Infrastructure.Repositories;

namespace Directum360Feedback.Application.Services;

public class EmployeeService(
    IRepository<Employee> employeeRepo,
    IMapper mapper,
    EmployeeImportDtoValidator importValidator) : IEmployeeService
{
    public async Task<IEnumerable<EmployeeDto>> GetAllEmployeesAsync()
    {
        var employees = await employeeRepo.GetAllAsync();
        var sorted = employees.OrderBy(x => x.FullName).ToList();
        return mapper.Map<IEnumerable<EmployeeDto>>(sorted);
    }

    public async Task<EmployeeDto> GetEmployeeByIdAsync(int id)
    {
        var employee = await employeeRepo.GetByIdAsync(id);
        return mapper.Map<EmployeeDto>(employee);
    }

    public async Task ImportEmployeesFromCsvAsync(Stream fileStream)
    {
        using var reader = new StreamReader(fileStream);
        using var csv = new CsvReader(reader, CultureInfo.InvariantCulture);

        List<EmployeeImportDto> records;
        try
        {
            // Roles в DTO — строка, поэтому CsvHelper не пытается парсить List<EmployeeRole>.
            records = csv.GetRecords<EmployeeImportDto>().ToList();
        }
        catch (CsvHelperException ex)
        {
            var row = ex.Context?.Parser?.Row ?? 0;
            throw new Exception($"Строка {row}: {ex.Message}");
        }

        var errors = new List<string>();
        var parsedRoles = new List<List<EmployeeRole>>(records.Count);
        var seenEmails = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var existingEmails = (await employeeRepo.GetAllAsync())
            .Select(e => e.Email.ToLowerInvariant())
            .ToHashSet();

        for (var i = 0; i < records.Count; i++)
        {
            var rec = records[i];
            var rowNumber = i + 2;  

            var validation = await importValidator.ValidateAsync(rec);
            foreach (var err in validation.Errors)
                errors.Add($"Строка {rowNumber}: {err.PropertyName} — {err.ErrorMessage}");

            var roles = TryParseRoles(rec.Roles, out var rolesError);
            if (rolesError != null)
                errors.Add($"Строка {rowNumber}: Roles — {rolesError}");
            parsedRoles.Add(roles);

            if (!string.IsNullOrWhiteSpace(rec.Email))
            {
                var email = rec.Email.Trim().ToLowerInvariant();
                if (!seenEmails.Add(email))
                    errors.Add($"Строка {rowNumber}: email «{rec.Email}» уже встречается в файле");
                if (existingEmails.Contains(email))
                    errors.Add($"Строка {rowNumber}: email «{rec.Email}» уже есть в справочнике");
            }
        }

        if (errors.Count > 0)
            throw new Exception(string.Join("; ", errors));

        // Все строки валидны — сохраняем атомарно
        for (int i = 0; i < records.Count; i++)
        {
            var rec = records[i];
            await employeeRepo.AddAsync(new Employee
            {
                FullName = rec.FullName.Trim(),
                Email = rec.Email.Trim().ToLowerInvariant(),
                Roles = parsedRoles[i]
            });
        }
        await employeeRepo.SaveChangesAsync();
    }
    
    private static List<EmployeeRole> TryParseRoles(string? raw, out string? error)
    {
        error = null;
        if (string.IsNullOrWhiteSpace(raw))
            return new List<EmployeeRole>();

        var parts = raw.Split(
            [';', '|', ','],
            StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        var roles = new List<EmployeeRole>(parts.Length);
        foreach (var part in parts)
        {
            if (!Enum.TryParse<EmployeeRole>(part, ignoreCase: true, out var role)
                || !Enum.IsDefined(role))
            {
                error = $"неизвестная роль «{part}»";
                return new List<EmployeeRole>();
            }
            roles.Add(role);
        }
        return roles;
    }

    public async Task<EmployeeDto> CreateEmployeeAsync(CreateEmployeeDto dto)
    {
        var employee = new Employee
        {
            FullName = dto.FullName,
            Email = dto.Email,
            Roles = dto.Roles
        };

        await employeeRepo.AddAsync(employee);
        await employeeRepo.SaveChangesAsync();
        return mapper.Map<EmployeeDto>(employee);
    }

    public async Task<EmployeeDto> GetInfoAboutEmployeeAsync(int id)
    {
        var employee = await employeeRepo.GetByIdAsync(id);
        return mapper.Map<EmployeeDto>(employee);
    }
}