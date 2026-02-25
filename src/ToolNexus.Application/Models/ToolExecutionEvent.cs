namespace ToolNexus.Application.Models;

public sealed class ToolExecutionEvent
{
    public string ToolSlug { get; init; } = string.Empty;
    public DateTime TimestampUtc { get; init; }
    public long DurationMs { get; init; }
    public bool Success { get; init; }
    public string? ErrorType { get; init; }
    public int PayloadSize { get; init; }
    public string ExecutionMode { get; init; } = string.Empty;
    public string Language { get; init; } = string.Empty;
    public string AdapterName { get; init; } = string.Empty;
    public string AdapterResolutionStatus { get; init; } = string.Empty;
    public string Capability { get; init; } = string.Empty;
    public string WorkerManagerUsed { get; init; } = string.Empty;
    public string LeaseAcquired { get; init; } = string.Empty;
    public string WorkerLeaseState { get; init; } = string.Empty;
    public string OrchestratorUsed { get; init; } = string.Empty;
}
