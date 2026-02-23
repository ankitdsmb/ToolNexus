namespace ToolNexus.Application.Models;

public sealed record ToolExecutionPolicyModel(
    int ToolId,
    string ToolSlug,
    string ExecutionMode,
    int TimeoutSeconds,
    int MaxRequestsPerMinute,
    int MaxInputSize,
    bool IsExecutionEnabled,
    string? VersionToken = null);

public sealed record UpdateToolExecutionPolicyRequest(
    string ExecutionMode,
    int TimeoutSeconds,
    int MaxRequestsPerMinute,
    int MaxInputSize,
    bool IsExecutionEnabled,
    string? VersionToken = null);
