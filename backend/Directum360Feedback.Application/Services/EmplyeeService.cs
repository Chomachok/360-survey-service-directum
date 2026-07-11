using AutoMapper;
using Directum360Feedback.Application.DTOs;
using Directum360Feedback.Application.Interfaces;
using Directum360Feedback.Domain.Entities;
using Directum360Feedback.Infrastructure.Repositories;
using CsvHelper;
using CsvHelper.Configuration;
using System.Globalization;
using System.IO;

namespace Directum360Feedback.Application.Services;

public class EmployeeService : IEmployeeService
{
    private readonly IRepository<Employee> _employeeRepo;
    private readonly IMapper _mapper;

    public EmployeeService(IRepository<Employee> employeeRepo, IMapper mapper)
    {
        _employeeRepo = employeeRepo;
        _mapper = mapper;
    }

    public async Task<IEnumerable<EmployeeDto>> GetAllEmployeesAsync()
    {
        var employees = await _employeeRepo.GetAllAsync();
        return _mapper.Map<IEnumerable<EmployeeDto>>(employees);
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
                Email = rec.Email
            };
            await _employeeRepo.AddAsync(employee);
        }
        await _employeeRepo.SaveChangesAsync();
    }

    private class EmployeeImportDto
    {
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
    }
}