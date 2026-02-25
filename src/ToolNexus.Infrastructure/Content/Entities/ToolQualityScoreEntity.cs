namespace ToolNexus.Infrastructure.Content.Entities;

public sealed class ToolQualityScoreEntity
{
    public string ToolId { get; set; } = string.Empty;
    public decimal Score { get; set; }
    public decimal ArchitectureScore { get; set; }
    public decimal TestCoverageScore { get; set; }
    public decimal CraftScore { get; set; }
    public DateTime TimestampUtc { get; set; }
}
