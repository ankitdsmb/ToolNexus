namespace ToolNexus.Infrastructure.Content.Entities;

public sealed class AiToolPackageEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Slug { get; set; } = string.Empty;
    public string Status { get; set; } = "Draft";
    public string ApprovalStatus { get; set; } = "Draft";
    public string JsonPayload { get; set; } = "{}";
    public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedUtc { get; set; } = DateTime.UtcNow;
    public int Version { get; set; } = 1;
    public string CorrelationId { get; set; } = string.Empty;
    public string TenantId { get; set; } = "default";
    public string? LastApprovalComment { get; set; }
    public string? ApprovedBy { get; set; }
    public DateTime? ApprovedAtUtc { get; set; }
}
