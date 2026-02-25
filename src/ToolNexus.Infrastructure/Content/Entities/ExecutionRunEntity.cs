namespace ToolNexus.Infrastructure.Content.Entities;

public sealed class ExecutionRunEntity
{
    public Guid Id { get; set; }
    public string ToolId { get; set; } = string.Empty;
    public DateTime ExecutedAtUtc { get; set; }
    public bool Success { get; set; }
    public long DurationMs { get; set; }
    public string? ErrorType { get; set; }
    public int PayloadSize { get; set; }
    public string ExecutionMode { get; set; } = string.Empty;
    public string RuntimeLanguage { get; set; } = string.Empty;
    public string AdapterName { get; set; } = string.Empty;
    public string AdapterResolutionStatus { get; set; } = string.Empty;
    public string Capability { get; set; } = string.Empty;
    public string Authority { get; set; } = string.Empty;
    public bool ShadowExecution { get; set; }
    public string? CorrelationId { get; set; }
    public string? TenantId { get; set; }
    public string? TraceId { get; set; }

    public ExecutionSnapshotEntity Snapshot { get; set; } = null!;
    public ExecutionConformanceResultEntity Conformance { get; set; } = null!;
    public ExecutionAuthorityDecisionEntity AuthorityDecision { get; set; } = null!;
}
