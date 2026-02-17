namespace ToolNexus.Application.Models;

public sealed record ExecutionMetrics(
    string ToolSlug,
    string Action,
    bool Success,
    bool CacheHit,
    long DurationMs);
