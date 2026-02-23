using System.Net;

namespace ToolNexus.Infrastructure.Content.Entities;

public sealed class AuditEventEntity
{
    public Guid Id { get; set; }
    public DateTime OccurredAtUtc { get; set; }
    public string ActorType { get; set; } = string.Empty;
    public string? ActorId { get; set; }
    public string? TenantId { get; set; }
    public string? TraceId { get; set; }
    public string? RequestId { get; set; }
    public string Action { get; set; } = string.Empty;
    public string? TargetType { get; set; }
    public string? TargetId { get; set; }
    public string ResultStatus { get; set; } = "success";
    public int? HttpStatus { get; set; }
    public IPAddress? SourceIp { get; set; }
    public string? UserAgent { get; set; }
    public string PayloadRedacted { get; set; } = "{}";
    public string PayloadHashSha256 { get; set; } = string.Empty;
    public int SchemaVersion { get; set; } = 1;
    public DateTime CreatedAtUtc { get; set; }

    public ICollection<AuditOutboxEntity> OutboxEntries { get; set; } = [];
}
