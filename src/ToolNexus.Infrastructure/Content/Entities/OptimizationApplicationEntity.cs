namespace ToolNexus.Infrastructure.Content.Entities;

public sealed class OptimizationApplicationEntity
{
    public Guid ApplicationId { get; set; }
    public Guid RecommendationId { get; set; }
    public string ActionType { get; set; } = string.Empty;
    public string OperatorId { get; set; } = string.Empty;
    public string AuthorityContext { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public DateTime? ScheduledForUtc { get; set; }
    public DateTime AppliedAtUtc { get; set; }
}
