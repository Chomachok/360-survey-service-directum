using Microsoft.AspNetCore.Mvc;
using Directum360Feedback.Application.Interfaces;

namespace Directum360Feedback.Api.Controllers;

[ApiController]
[Route("api/surveys/{surveyId}/[controller]")]
public class ResultsController : ControllerBase
{
    private readonly IResultService _resultService;

    public ResultsController(IResultService resultService)
    {
        _resultService = resultService;
    }

    [HttpGet]
    public async Task<IActionResult> GetResults(int surveyId)
    {
        try
        {
            var results = await _resultService.GetSurveyResultsAsync(surveyId);
            return Ok(results);
        }
        catch (Exception ex)
        {
            return NotFound(ex.Message);
        }
    }

    [HttpGet("export/docx")]
    public async Task<IActionResult> ExportDocx(int surveyId)
    {
        var bytes = await _resultService.ExportDocxAsync(surveyId);
        return File(bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document", $"results_{surveyId}.docx");
    }
}