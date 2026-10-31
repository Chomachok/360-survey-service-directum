using Microsoft.AspNetCore.Mvc;

namespace Directum360Feedback.Api.Middleware;

public sealed class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;
    private readonly IHostEnvironment _env;

    public ExceptionHandlingMiddleware(
        RequestDelegate next,
        ILogger<ExceptionHandlingMiddleware> logger,
        IHostEnvironment env)
    {
        _next = next;
        _logger = logger;
        _env = env;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
        {
            _logger.LogDebug("Request aborted by client: {Method} {Path}",
                context.Request.Method, context.Request.Path);
        }
        catch (Exception ex)
        {
            if (context.Response.HasStarted)
            {
                _logger.LogWarning(ex, "Cannot write error response: response already started");
                throw;
            }

            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var (status, title) = ExceptionMapping.Map(exception);

        if (status >= 500)
        {
            _logger.LogError(exception,
                "Unhandled exception on {Method} {Path}",
                context.Request.Method, context.Request.Path);
        }
        else if (status is StatusCodes.Status401Unauthorized
                       or StatusCodes.Status403Forbidden
                       or StatusCodes.Status409Conflict
                       or StatusCodes.Status404NotFound)
        {
            _logger.LogWarning(
                "Handled {Type} ({Status}) on {Method} {Path}: {Message}",
                exception.GetType().Name, status,
                context.Request.Method, context.Request.Path,
                exception.Message);
        }
        else
        {
            _logger.LogInformation(
                "Handled {Type} ({Status}) on {Method} {Path}: {Message}",
                exception.GetType().Name, status,
                context.Request.Method, context.Request.Path,
                exception.Message);
        }

        var detail = status >= 500 && !_env.IsDevelopment()
            ? "Internal server error"
            : exception.Message;

        var problem = new ProblemDetails
        {
            Status = status,
            Title = title,
            Detail = detail,
            Instance = context.Request.Path,
            Type = $"https://httpstatuses.io/{status}"
        };

        context.Response.Clear();
        context.Response.StatusCode = status;
        context.Response.ContentType = "application/problem+json";
        await context.Response.WriteAsJsonAsync(problem, context.RequestAborted);
    }
}