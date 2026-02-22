namespace ToolNexus.Infrastructure.Content.Entities;

public sealed class ToolExecutionPolicyEntity
{
    public int Id { get; set; }
    public int ToolDefinitionId { get; set; }
    public required string ToolSlug { get; set; }
    public required string ExecutionMode { get; set; }
    public int TimeoutSeconds { get; set; }
    public int MaxRequestsPerMinute { get; set; }
    public int MaxInputSize { get; set; }
    public bool IsExecutionEnabled { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
