namespace ToolNexus.Infrastructure.Content.Entities;

public sealed class CssScanJob
{
    public Guid Id { get; set; }
    public required string Url { get; set; }
    public required string Status { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset? StartedAtUtc { get; set; }
    public DateTimeOffset? CompletedAtUtc { get; set; }

    public int? ScanDurationMs { get; set; }
    public int PagesScanned { get; set; }
    public string? JobMetadataJson { get; set; }

    public List<CssScanResult> Results { get; set; } = [];
}
