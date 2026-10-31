using Directum360Feedback.Application.DTOs.EmployeeDTOs;
using Directum360Feedback.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Directum360Feedback.Api.Controllers;

/// <summary>
/// Controller for admin panel.
/// </summary>
[ApiController]
[Route("admin-panel/employees")]
[Authorize(Roles = "SystemAdministrator")]
public class AdminPanelController : ControllerBase
{
    private readonly IAdminPanelService _adminPanelService;
    
    public AdminPanelController(IAdminPanelService adminPanelService)
    {
        _adminPanelService = adminPanelService;
    }
    
    /// <summary>
    /// Endpoint for get list of all employees.
    /// </summary>
    /// <returns>List of employees.</returns>
    [HttpGet]
    public async Task<IActionResult> GetListOfEmployeesAsync()
    {
        var employees = await _adminPanelService.GetAllEmployeesAsync();
        
        return Ok(employees);
    }
    
    /// <summary>
    /// Get employee by id
    /// </summary>
    /// <param name="id">employee id</param>
    /// <returns>200 if employye founded. Else 404 not found.</returns>
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetEmployeeByIdAsync(int id)
    {
        var employee = await _adminPanelService.GetEmployeeByIdAsync(id);
        return employee is null ? NotFound() : Ok(employee);
    }
    
    /// <summary>
    /// Add employee manually.
    /// </summary>
    /// <param name="employeeDto">Dto with employee's data.</param>
    /// <returns>Created (201) status code.</returns>
    [HttpPost("create")]
    public async Task<IActionResult> AddEmployeeAsync([FromBody] CreateEmployeeDto employeeDto)
    {
        var employee = await _adminPanelService.AddEmployeeAsync(employeeDto);
        
        return CreatedAtAction(nameof(GetEmployeeByIdAsync), new { id = employee.Id }, employee);
    }
    
    /// <summary>
    /// Update employee info.
    /// </summary>
    /// <param name="newEmployeeDto">EmployeeDto with new data.</param>
    /// <param name="id">Employee id.</param>
    /// <returns>200Ok with updated EmployeeDto.</returns>
    [HttpPatch("update/{id:int}")]
    public async Task<IActionResult> UpdateEmployeeAsync(
        [FromBody] UpdateEmployeeDto newEmployeeDto, 
        [FromRoute] int id)
    {
        var updatedEmployee = await _adminPanelService.UpdateEmployeeAsync(newEmployeeDto, id);
        
        return Ok(updatedEmployee);
    }
    
    /// <summary>
    /// Delete employee.
    /// </summary>
    /// <param name="id">Employee id.</param>
    /// <returns>204NoContent if successfully deleted.</returns>
    [HttpDelete("delete/{id:int}")]
    public async Task<IActionResult> DeleteEmployeeAsync(int id)
    {
        await _adminPanelService.DeleteEmployeeAsync(id);

        return NoContent();
    }
    
    /// <summary>
    /// Import employees from csv file.
    /// </summary>
    /// <param name="file">csv file with employees' info.</param>
    /// <returns>200 successfully add.</returns>
    [HttpPost("import")]
    public async Task<IActionResult> ImportEmployeeAsync(IFormFile file)
    {
        if (file.Length == 0)
        {
            return BadRequest(new { message = "File doesn't correct" });
        }

        try
        {
            await using var stream = file.OpenReadStream();
            await _adminPanelService.ImportEmployeesFromCsvAsync(stream);
            return Ok(new { message = "Employees was imported successfully" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = $"Import error: {ex.Message}" });
        }
    }
}