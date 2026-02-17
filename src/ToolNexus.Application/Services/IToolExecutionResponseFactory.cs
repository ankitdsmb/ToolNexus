using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public interface IToolExecutionResponseFactory
{
    ToolExecutionResponse Success(string output, long executionTimeMs, bool fromCache);
    ToolExecutionResponse Failure(string code, string message, string? detail, long executionTimeMs, bool fromCache);
}
