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

    [HttpGet]
    public async Task<IActionResult> GetMatrix(int surveyId) => Ok(await _matrixService.GetMatrixForSurveyAsync(surveyId));

    [HttpPost]
    public async Task<IActionResult> AddMatrixItem(int surveyId, CreateMatrixItemDto dto)
    {
        var item = await _matrixService.AddMatrixItemAsync(surveyId, dto);
        return Ok(item);
    }

    [HttpDelete("{assignmentId}")]
    public async Task<IActionResult> DeleteMatrixItem(int assignmentId)
    {
        await _matrixService.RemoveMatrixItemAsync(assignmentId);
        return NoContent();
    }
}