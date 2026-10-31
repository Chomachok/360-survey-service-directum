using Directum360Feedback.Domain.Enums;

namespace Directum360Feedback.Application.DTOs.EmployeeDTOs;

public class UpdateEmployeeDto
{
    public string? FullName { get; set; }
    public string? Email { get; set; }
    public ICollection<EmployeeRole>? Roles { get; set; }
}