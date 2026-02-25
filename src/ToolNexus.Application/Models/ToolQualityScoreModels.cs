namespace ToolNexus.Application.Models;

public sealed record ToolQualityScoreRecord(
    string ToolId,
    decimal Score,
    decimal ArchitectureScore,
    decimal TestCoverageScore,
    decimal CraftScore,
    DateTime TimestampUtc);

public sealed record ToolQualityScoreQuery(
    int Limit,
    string? ToolId,
    DateTime? StartDateUtc,
    DateTime? EndDateUtc);

public sealed record ToolQualityScoreDashboard(
    IReadOnlyList<ToolQualityScoreRecord> Items,
    IReadOnlyList<ToolQualityScoreRecord> LatestByTool);
