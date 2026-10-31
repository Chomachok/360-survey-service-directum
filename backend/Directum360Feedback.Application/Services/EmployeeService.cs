using AutoMapper;
using Directum360Feedback.Application.Interfaces;
using Directum360Feedback.Domain.Entities;
using Directum360Feedback.Infrastructure.Repositories;
using CsvHelper;
using System.Globalization;
using Directum360Feedback.Application.DTOs.EmployeeDTOs;

namespace Directum360Feedback.Application.Services;

public class EmployeeService(IRepository<Employee> employeeRepo, IMapper mapper) : IEmployeeService
{
    public async Task<IEnumerable<EmployeeDto>> GetAllEmployeesAsync()
    {
        var employees = await employeeRepo.GetAllAsync();
        var sorted = employees.OrderBy(x => x.FullName).ToList();
        return mapper.Map<IEnumerable<EmployeeDto>>(sorted);
    }

    public async Task ImportEmployeesFromCsvAsync(Stream fileStream)
    {
        using var reader = new StreamReader(fileStream);
        using var csv = new CsvReader(reader, CultureInfo.InvariantCulture);
        var records = csv.GetRecords<EmployeeImportDto>();
        foreach (var rec in records)
        {
            var employee = new Employee
            {
                FullName = rec.FullName,
                Email = rec.Email,
                Roles = rec.Roles
            };
            await employeeRepo.AddAsync(employee);
        }
        await employeeRepo.SaveChangesAsync();
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
}