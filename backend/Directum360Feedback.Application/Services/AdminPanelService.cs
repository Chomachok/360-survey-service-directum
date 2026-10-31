using System.Globalization;
using System.Net.Mail;
using AutoMapper;
using CsvHelper;
using CsvHelper.Configuration;
using Directum360Feedback.Application.DTOs.EmployeeDTOs;
using Directum360Feedback.Application.Interfaces;
using Directum360Feedback.Domain.Entities;
using Directum360Feedback.Domain.Enums;
using Directum360Feedback.Infrastructure.Repositories;

namespace Directum360Feedback.Application.Services;

public class AdminPanelService : IAdminPanelService
{
    private readonly IRepository<Employee> _employeeRepository;
    private readonly IMapper _mapper;

    public AdminPanelService(IRepository<Employee> employeeRepository, IMapper mapper)
    {
        _employeeRepository = employeeRepository;
        _mapper = mapper;
    }

    public async Task<IReadOnlyCollection<EmployeeDto>> GetAllEmployeesAsync()
    {
        var employees = await _employeeRepository.GetAllAsync();
        var sorted = employees.OrderBy(emp => emp.FullName).ToList();
        return _mapper.Map<IReadOnlyCollection<EmployeeDto>>(sorted);
    }

    public async Task<EmployeeDto?> GetEmployeeByIdAsync(int id)
    {
        var employee = await _employeeRepository.GetByIdAsync(id);
        return employee is null ? null : _mapper.Map<EmployeeDto>(employee);
    }

    public async Task<EmployeeDto> AddEmployeeAsync(CreateEmployeeDto employeeDto)
    {
        var employee = new Employee
        {
            FullName = employeeDto.FullName,
            Email = employeeDto.Email,
            Roles = employeeDto.Roles.ToList()
        };

        await _employeeRepository.AddAsync(employee);
        await _employeeRepository.SaveChangesAsync();
        return _mapper.Map<EmployeeDto>(employee);
    }

    public async Task<EmployeeDto> UpdateEmployeeAsync(EmployeeDto newEmployeeDto, int id)
    {
        var employee = await _employeeRepository.GetByIdAsync(id)
            ?? throw new KeyNotFoundException($"Employee with id {id} not found");

        employee.FullName = newEmployeeDto.FullName;
        employee.Email = newEmployeeDto.Email;
        employee.Roles = newEmployeeDto.Roles.ToList();

        _employeeRepository.Update(employee);
        await _employeeRepository.SaveChangesAsync();

        return _mapper.Map<EmployeeDto>(employee);
    }

    public async Task DeleteEmployeeAsync(int id)
    {
        var employee = await _employeeRepository.GetByIdAsync(id)
            ?? throw new KeyNotFoundException($"Employee with id {id} not found");

        _employeeRepository.Delete(employee);
        await _employeeRepository.SaveChangesAsync();
    }

    public async Task ImportEmployeesFromCsvAsync(Stream fileStream)
    {
        using var reader = new StreamReader(fileStream, leaveOpen: true);
        using var csv = new CsvReader(reader, new CsvConfiguration(CultureInfo.InvariantCulture)
        {
            HasHeaderRecord = true,
            TrimOptions = TrimOptions.Trim,
            MissingFieldFound = null,
            HeaderValidated = null
        });

        var existing = await _employeeRepository.GetAllAsync();
        var existingEmails = existing
            .Select(e => e.Email)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var toAdd = new List<Employee>();
        var errors = new List<string>();

        try
        {
            while (csv.Read())
            {
                var lineNumber = csv.Context.Parser.Row;

                // Имена колонок должны совпадать с заголовками CSV
                var fullName = csv.GetField<string?>("FullName");
                var email = csv.GetField<string?>("Email");
                var rolesRaw = csv.GetField<string?>("Roles");

                if (string.IsNullOrWhiteSpace(fullName))
                {
                    errors.Add($"Line {lineNumber}: FullName is empty");
                    continue;
                }

                if (string.IsNullOrWhiteSpace(email) || !IsValidEmail(email))
                {
                    errors.Add($"Line {lineNumber}: invalid email '{email}'");
                    continue;
                }

                var trimmedEmail = email.Trim();
                if (!existingEmails.Add(trimmedEmail))
                {
                    errors.Add($"Line {lineNumber}: duplicate email '{trimmedEmail}'");
                    continue;
                }

                var roles = ParseRoles(rolesRaw);
                if (roles.Count == 0 && !string.IsNullOrWhiteSpace(rolesRaw))
                {
                    errors.Add($"Line {lineNumber}: unknown roles '{rolesRaw}'");
                    continue;
                }

                toAdd.Add(new Employee
                {
                    FullName = fullName.Trim(),
                    Email = trimmedEmail,
                    Roles = roles
                });
            }
        }
        catch (CsvHelperException ex)
        {
            throw new InvalidOperationException($"Cannot parse CSV: {ex.Message}", ex);
        }

        if (toAdd.Count == 0 && errors.Count == 0)
        {
            throw new InvalidOperationException("CSV file contains no records");
        }

        if (errors.Count > 0)
        {
            throw new InvalidOperationException(
                $"CSV validation failed:{Environment.NewLine}{string.Join(Environment.NewLine, errors)}");
        }

        foreach (var employee in toAdd)
        {
            await _employeeRepository.AddAsync(employee);
        }

        await _employeeRepository.SaveChangesAsync();
    }

    private static bool IsValidEmail(string email)
    {
        try
        {
            var addr = new MailAddress(email);
            return string.Equals(addr.Address, email.Trim(), StringComparison.OrdinalIgnoreCase);
        }
        catch
        {
            return false;
        }
    }

    private static List<EmployeeRole> ParseRoles(string? rolesRaw)
    {
        if (string.IsNullOrWhiteSpace(rolesRaw))
        {
            return new List<EmployeeRole>();
        }

        var result = new List<EmployeeRole>();
        var parts = rolesRaw.Split(
            [';', '|', ','],
            StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        foreach (var part in parts)
        {
            if (Enum.TryParse<EmployeeRole>(part, ignoreCase: true, out var role))
            {
                result.Add(role);
            }
        }

        return result;
    }
}