namespace ToolNexus.Infrastructure.Content.Entities;

public sealed class ExecutionConformanceResultEntity
{
    public Guid Id { get; set; }
    public Guid ExecutionRunId { get; set; }
    public bool IsValid { get; set; }
    public string NormalizedStatus { get; set; } = string.Empty;
    public bool WasNormalized { get; set; }
    public int IssueCount { get; set; }
    public string IssuesJson { get; set; } = "[]";

    public ExecutionRunEntity ExecutionRun { get; set; } = null!;
}
