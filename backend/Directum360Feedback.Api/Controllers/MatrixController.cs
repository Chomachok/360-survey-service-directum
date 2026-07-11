using Microsoft.AspNetCore.Mvc;
using Directum360Feedback.Application.DTOs;
using Directum360Feedback.Application.Interfaces;

namespace Directum360Feedback.Api.Controllers;

[ApiController]
[Route("api/surveys/{surveyId}/[controller]")]
public class MatrixController : ControllerBase
{
    private readonly IMatrixService _matrixService;

    public MatrixController(IMatrixService matrixService)
    {
        _matrixService = matrixService;
    }

    // GET /api/surveys/{surveyId}/matrix
    [HttpGet]
    public async Task<IActionResult> GetMatrix(int surveyId)
    {
        var items = await _matrixService.GetMatrixForSurveyAsync(surveyId);
        return Ok(items);
    }

    // POST /api/surveys/{surveyId}/matrix
    [HttpPost]
    public async Task<IActionResult> AddMatrixItem(int surveyId, [FromBody] CreateMatrixItemDto dto)
    {
        try
        {
            var item = await _matrixService.AddMatrixItemAsync(surveyId, dto);
            return Ok(item);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("~/api/matrix/{assignmentId}")]
    public async Task<IActionResult> DeleteMatrixItem(int assignmentId)
    {
        try
        {
            await _matrixService.RemoveMatrixItemAsync(assignmentId);
            return NoContent();
        }
        catch (Exception ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
}