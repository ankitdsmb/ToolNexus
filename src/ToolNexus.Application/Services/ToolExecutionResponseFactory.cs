using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public sealed class ToolExecutionResponseFactory : IToolExecutionResponseFactory
{
    public ToolExecutionResponse Success(string output, long executionTimeMs, bool fromCache) =>
        new(
            true,
            output,
            null,
            new ToolExecutionMetadata(executionTimeMs, fromCache));

    public ToolExecutionResponse Failure(string code, string message, string? detail, long executionTimeMs, bool fromCache) =>
        new(
            false,
            null,
            new ToolError(code, message, detail),
            new ToolExecutionMetadata(executionTimeMs, fromCache));
}
