using Directum360Feedback.Application.DTOs;

namespace Directum360Feedback.Application.Interfaces;

public interface IEmployeeService
{
    Task<IEnumerable<EmployeeDto>> GetAllEmployeesAsync();
    Task ImportEmployeesFromCsvAsync(Stream fileStream);
}