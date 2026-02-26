namespace ToolNexus.Infrastructure.Content.Entities;

public sealed class CapabilityRegistryEntity
{
    public Guid Id { get; set; }
    public string CapabilityId { get; set; } = string.Empty;
    public string Provider { get; set; } = string.Empty;
    public string Version { get; set; } = string.Empty;
    public string ToolId { get; set; } = string.Empty;
    public string RuntimeLanguage { get; set; } = string.Empty;
    public int ComplexityTier { get; set; }
    public string PermissionsJson { get; set; } = "[]";
    public int Status { get; set; }
    public int InstallationState { get; set; }
    public string Authority { get; set; } = string.Empty;
    public string SnapshotId { get; set; } = string.Empty;
    public string? PolicyVersionToken { get; set; }
    public bool PolicyExecutionEnabled { get; set; }
    public DateTime SyncedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
}
