using Microsoft.AspNetCore.Mvc;
using Directum360Feedback.Application.DTOs;
using Directum360Feedback.Application.Interfaces;

namespace Directum360Feedback.Api.Controllers;

[ApiController]
[Route("api/surveys/{surveyId}/[controller]")]
public class MatrixController(IMatrixService matrixService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetMatrix(int surveyId) => Ok(await matrixService.GetMatrixForSurveyAsync(surveyId));

    [HttpPost]
    public async Task<IActionResult> AddMatrixItem(int surveyId, CreateMatrixItemDto dto)
    {
        var item = await matrixService.AddMatrixItemAsync(surveyId, dto);
        return Ok(item);
    }

    [HttpDelete("{assignmentId}")]
    public async Task<IActionResult> DeleteMatrixItem(int assignmentId)
    {
        try
        {
            await matrixService.RemoveMatrixItemAsync(assignmentId);
            return NoContent();
        }
        catch (Exception ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
}