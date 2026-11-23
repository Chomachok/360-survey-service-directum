using Directum360Feedback.Domain.Enums;

namespace Directum360Feedback.Application.DTOs.EmployeeDTOs;

public class EmployeeImportDto
{
    
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Roles { get; set; } = string.Empty;
}