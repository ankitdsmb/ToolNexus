namespace ToolNexus.Application.Models;

/// <summary>
/// Unified runtime identity contract emitted by the server execution pipeline.
/// </summary>
public sealed record RuntimeIdentity(
    string RuntimeType,
    string Adapter,
    string WorkerType,
    bool FallbackUsed,
    string ExecutionAuthority);
