using Microsoft.AspNetCore.Mvc;
using Directum360Feedback.Application.DTOs.SurveyTemplateDTOs;
using Directum360Feedback.Application.Interfaces;

namespace Directum360Feedback.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SurveyTemplatesController(ISurveyTemplateService templateService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll() => Ok(await templateService.GetAllAsync());

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(int id)
    {
        var template = await templateService.GetByIdAsync(id);
        if (template == null) return NotFound();
        return Ok(template);
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateSurveyTemplateDto dto)
    {
        var created = await templateService.CreateAsync(dto);
        return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, UpdateSurveyTemplateDto dto)
    {
        var updated = await templateService.UpdateAsync(id, dto);
        return Ok(updated);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        await templateService.DeleteAsync(id);
        return NoContent();
    }
}