namespace ToolNexus.Infrastructure.Content.Entities;

public sealed class ToolAnomalySnapshotEntity
{
    public long Id { get; set; }
    public string ToolSlug { get; set; } = string.Empty;
    public DateTimeOffset DateUtc { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Severity { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}
