using Directum360Feedback.Domain.Enums;

namespace Directum360Feedback.Application.DTOs.EmployeeDTOs;

public class EmployeeDto
{
    public int Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public ICollection<EmployeeRole> Roles { get; set; } = [];
}