using Microsoft.EntityFrameworkCore;

namespace Directum360Feedback.Api.Middleware;

public static class ExceptionMapping
{
    public static (int Status, string Title) Map(Exception exception) => exception switch
    {
        KeyNotFoundException        => (StatusCodes.Status404NotFound,            "Resource not found"),
        ArgumentNullException       => (StatusCodes.Status400BadRequest,          "Invalid argument"),
        ArgumentException           => (StatusCodes.Status400BadRequest,          "Invalid argument"),
        UnauthorizedAccessException => (StatusCodes.Status403Forbidden,           "Forbidden"),
        InvalidOperationException   => (StatusCodes.Status409Conflict,            "Operation failed"),
        NotImplementedException     => (StatusCodes.Status501NotImplemented,      "Not implemented"),

        DbUpdateConcurrencyException => (StatusCodes.Status409Conflict,           "Concurrency conflict"),
        DbUpdateException            => (StatusCodes.Status409Conflict,           "Data conflict"),

        _ => (StatusCodes.Status500InternalServerError, "Unexpected error")
    };
}