using Microsoft.AspNetCore.Mvc;
using Directum360Feedback.Application.DTOs;
using Directum360Feedback.Application.DTOs.RespondentTemplateDTOs;
using Directum360Feedback.Application.Interfaces;

namespace Directum360Feedback.Api.Controllers;

[ApiController]
[Route("api/respondent-templates")]
public class RespondentTemplatesController(IRespondentTemplateService service) : ControllerBase
{
    /// <summary>Список всех шаблонов респондентов</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll() => Ok(await service.GetAllAsync());

    /// <summary>Один шаблон</summary>
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        try { return Ok(await service.GetByIdAsync(id)); }
        catch (Exception ex) { return NotFound(new { message = ex.Message }); }
    }

    /// <summary>Создать шаблон вручную</summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateRespondentTemplateDto dto)
    {
        try { return Ok(await service.CreateAsync(dto)); }
        catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
    }

    /// <summary>Изменить шаблон (состав перезаписывается целиком)</summary>
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateRespondentTemplateDto dto)
    {
        try { return Ok(await service.UpdateAsync(id, dto)); }
        catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
    }

    /// <summary>Удалить шаблон</summary>
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            await service.DeleteAsync(id);
            return NoContent();
        }
        catch (Exception ex) { return NotFound(new { message = ex.Message }); }
    }

    /// <summary>Сохранить вручную набранный список респондентов как шаблон</summary>
    [HttpPost("from-survey")]
    public async Task<IActionResult> CreateFromSurvey([FromBody] CreateTemplateFromSurveyDto dto)
    {
        try { return Ok(await service.CreateFromSurveyAsync(dto)); }
        catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
    }

    /// <summary>Развернуть шаблон в матрицу опроса для выбранного оцениваемого</summary>
    [HttpPost("~/api/surveys/{surveyId:int}/matrix/apply-template")]
    public async Task<IActionResult> ApplyToSurvey(int surveyId, [FromBody] ApplyRespondentTemplateDto dto)
    {
        try { return Ok(await service.ApplyToSurveyAsync(surveyId, dto)); }
        catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
    }
}
