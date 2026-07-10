using Microsoft.AspNetCore.Mvc;
using Survey360.Api.DTOs.Surveys;
using Survey360.Api.DTOs.Assignments;
using Survey360.Api.DTOs.Templates;
using Survey360.Api.Interfaces;
using Survey360.Api.Enums;

namespace Survey360.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SurveysController(ISurveysService surveysService) : ControllerBase
{
    [HttpPost("create")]
    public async Task<ActionResult<SurveyResponse>> Create([FromBody] SurveyCreateRequest request)
    {
        try
        {
            var result = await surveysService.CreateSurveyAsync(request);
            return Created($"/api/surveys/{result.Id}", result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            return StatusCode(500, "Внутренняя ошибка сервера");
        }
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<SurveySummaryResponse>>> GetAll()
    {
        var surveys = await surveysService.GetAllSurveysAsync();
        return Ok(surveys);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<SurveyResponse>> GetById(int id)
    {
        var survey = await surveysService.GetSurveyByIdAsync(id);
        if (survey == null)
            return NotFound();
        return Ok(survey);
    }

    [HttpPatch("status/{id:int}")]
    public async Task<IActionResult> ChangeStatus(int id, [FromBody] UpdateSurveyStatusRequest request)
    {
        if (id != request.SurveyId)
            return BadRequest("ID не совпадают");

        if (!Enum.TryParse<SurveyStatus>(request.Status, true, out var newStatus))
            return BadRequest("Некорректный статус");

        try
        {
            var result = await surveysService.ChangeSurveyStatusAsync(id, newStatus);
            if (!result)
                return NotFound();
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpDelete("delete/{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            var result = await surveysService.DeleteSurveyAsync(id);
            if (!result)
                return NotFound();
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    // ===== МАТРИЦА =====

    [HttpPost("assignments/{surveyId:int}")]
    public async Task<ActionResult<AssignmentResponse>> CreateAssignment(int surveyId, [FromBody] AssignmentCreateRequest request)
    {
        if (surveyId != request.SurveyId)
            return BadRequest("ID не совпадают");

        try
        {
            var result = await surveysService.CreateAssignmentAsync(request);
            return Created($"/api/assignments/{result.Id}", result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpGet("assignments/{surveyId:int}")]
    public async Task<ActionResult<IEnumerable<AssignmentResponse>>> GetAssignments(int surveyId)
    {
        var assignments = await surveysService.GetSurveyAssignmentsAsync(surveyId);
        return Ok(assignments);
    }

    [HttpDelete("assignments/{assignmentId:int}")]
    public async Task<IActionResult> DeleteAssignment(int assignmentId)
    {
        try
        {
            var result = await surveysService.DeleteAssignmentAsync(assignmentId);
            if (!result)
                return NotFound();
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    // ===== ВОПРОСЫ =====

    [HttpGet("questions/{surveyId:int}")]
    public async Task<ActionResult<IEnumerable<TemplateQuestionDto>>> GetQuestions(int surveyId)
    {
        var questions = await surveysService.GetSurveyQuestionsAsync(surveyId);
        return Ok(questions);
    }
}