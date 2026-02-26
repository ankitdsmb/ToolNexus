namespace ToolNexus.Infrastructure.Content.Entities;

public sealed class ToolGenerationDraftEntity
{
    public Guid DraftId { get; set; } = Guid.NewGuid();
    public Guid SignalId { get; set; }
    public string ToolSlug { get; set; } = string.Empty;
    public string ManifestJson { get; set; } = "{}";
    public string InputSchemaJson { get; set; } = "{}";
    public string OutputSchemaJson { get; set; } = "{}";
    public string UiSchemaJson { get; set; } = "{}";
    public string SeoContent { get; set; } = string.Empty;
    public string ExampleUsage { get; set; } = string.Empty;
    public string SafetyNotes { get; set; } = string.Empty;
    public string GeneratedCapabilityClass { get; set; } = string.Empty;
    public string SuggestedRuntimeLanguage { get; set; } = string.Empty;
    public string RequiredPermissions { get; set; } = string.Empty;
    public decimal DraftQualityScore { get; set; }
    public string RiskLevel { get; set; } = "Low";
    public string Status { get; set; } = "Draft";
    public string CorrelationId { get; set; } = string.Empty;
    public string TenantId { get; set; } = "default";
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
