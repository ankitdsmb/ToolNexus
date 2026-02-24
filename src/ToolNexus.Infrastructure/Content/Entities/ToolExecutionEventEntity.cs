namespace ToolNexus.Infrastructure.Content.Entities;

public sealed class ToolExecutionEventEntity
{
    public long Id { get; set; }
    public string ToolSlug { get; set; } = string.Empty;
    public DateTimeOffset TimestampUtc { get; set; }
    public long DurationMs { get; set; }
    public bool Success { get; set; }
    public string? ErrorType { get; set; }
    public int PayloadSize { get; set; }
    public string ExecutionMode { get; set; } = string.Empty;
}
