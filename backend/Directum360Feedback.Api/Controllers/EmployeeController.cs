using Microsoft.AspNetCore.Mvc;
using Directum360Feedback.Application.DTOs;
using Directum360Feedback.Application.Interfaces;

namespace Directum360Feedback.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EmployeesController(IEmployeeService employeeService) : ControllerBase
{
    /// <summary>
    /// Получить список всех сотрудников
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var employees = await employeeService.GetAllEmployeesAsync();
        return Ok(employees);
    }

    /// <summary>
    /// Создать нового сотрудника
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateEmployeeDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        try
        {
            var employee = await employeeService.CreateEmployeeAsync(dto);
            return CreatedAtAction(nameof(GetAll), new { id = employee.Id }, employee);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Импорт сотрудников из CSV/XLSX файла
    /// </summary>
    [HttpPost("import")]
    public async Task<IActionResult> Import(IFormFile file)
    {
        if (file.Length == 0)
            return BadRequest(new { message = "Файл не выбран или пуст" });

        try
        {
            await using var stream = file.OpenReadStream();
            await employeeService.ImportEmployeesFromCsvAsync(stream);
            return Ok(new { message = "Сотрудники успешно импортированы" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = $"Ошибка импорта: {ex.Message}" });
        }
    }
}