namespace ToolNexus.Application.Models;

public sealed record ToolExecutionResponse(
    bool Success,
    string? Output,
    ToolError? Error,
    ToolExecutionMetadata Metadata);

public sealed record ToolError(
    string Code,
    string Message,
    string? Detail);

public sealed record ToolExecutionMetadata(
    long ExecutionTimeMs,
    bool FromCache);
