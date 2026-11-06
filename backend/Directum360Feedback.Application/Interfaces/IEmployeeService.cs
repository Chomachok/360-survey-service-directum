using Directum360Feedback.Application.DTOs;
using Directum360Feedback.Application.DTOs.EmployeeDTOs;

namespace Directum360Feedback.Application.Interfaces;

public interface IEmployeeService
{
    Task<IEnumerable<EmployeeDto>> GetAllEmployeesAsync();
    Task<EmployeeDto> GetEmployeeByIdAsync(int id);
    Task ImportEmployeesFromCsvAsync(Stream fileStream);
    Task<EmployeeDto> CreateEmployeeAsync(CreateEmployeeDto dto);
    Task<EmployeeDto> GetInfoAboutEmployeeAsync(int id);
}