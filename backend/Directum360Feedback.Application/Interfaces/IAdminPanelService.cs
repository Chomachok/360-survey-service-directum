using Directum360Feedback.Application.DTOs.EmployeeDTOs;

namespace Directum360Feedback.Application.Interfaces;

public interface IAdminPanelService
{
    Task<IReadOnlyCollection<EmployeeDto>> GetAllEmployeesAsync();
    Task<EmployeeDto?> GetEmployeeByIdAsync(int id);
    Task<EmployeeDto> AddEmployeeAsync(CreateEmployeeDto employeeDto);
    Task<EmployeeDto> UpdateEmployeeAsync(UpdateEmployeeDto newEmployeeDto, int id);
    Task DeleteEmployeeAsync(int id);
    Task ImportEmployeesFromCsvAsync(Stream fileStream);
}