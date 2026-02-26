namespace ToolNexus.Infrastructure.Content.Entities;

public sealed class GenerationValidationReportEntity
{
    public Guid ReportId { get; set; } = Guid.NewGuid();
    public Guid DraftId { get; set; }
    public bool SchemaValidatorPassed { get; set; }
    public bool CapabilityPolicyValidatorPassed { get; set; }
    public bool ForbiddenOperationScannerPassed { get; set; }
    public bool SeoQualityCheckPassed { get; set; }
    public bool UxConsistencyValidatorPassed { get; set; }
    public bool ExecutionContractValidatorPassed { get; set; }
    public bool Passed { get; set; }
    public string FailureReasonsJson { get; set; } = "[]";
    public string CorrelationId { get; set; } = string.Empty;
    public string TenantId { get; set; } = "default";
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
