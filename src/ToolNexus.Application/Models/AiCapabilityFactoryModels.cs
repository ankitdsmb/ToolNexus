namespace ToolNexus.Application.Models;

public enum AiGenerationDraftStatus
{
    Draft,
    ValidationFailed,
    Validated,
    GovernanceReview,
    GovernanceApproved,
    SandboxPassed,
    OperatorApproved,
    Active,
    Rejected,
    ImprovementRequested
}

public enum AiGenerationDecisionAction
{
    Approve,
    Reject,
    RequestImprovement
}

public sealed record AiGenerationSignalRecord(
    Guid SignalId,
    string Source,
    int Frequency,
    decimal ImpactEstimate,
    string SuggestedToolCategory,
    decimal ConfidenceScore,
    string CorrelationId,
    string TenantId,
    DateTime CreatedAtUtc);

public sealed record AiToolGenerationDraftRecord(
    Guid DraftId,
    Guid SignalId,
    string ToolSlug,
    string ManifestJson,
    string InputSchemaJson,
    string OutputSchemaJson,
    string UiSchemaJson,
    string SeoContent,
    string ExampleUsage,
    string SafetyNotes,
    string GeneratedCapabilityClass,
    string SuggestedRuntimeLanguage,
    string RequiredPermissions,
    decimal DraftQualityScore,
    string RiskLevel,
    AiGenerationDraftStatus Status,
    string CorrelationId,
    string TenantId,
    DateTime CreatedAtUtc);

public sealed record AiGenerationValidationReportRecord(
    Guid ReportId,
    Guid DraftId,
    bool SchemaValidatorPassed,
    bool CapabilityPolicyValidatorPassed,
    bool ForbiddenOperationScannerPassed,
    bool SeoQualityCheckPassed,
    bool UxConsistencyValidatorPassed,
    bool ExecutionContractValidatorPassed,
    bool Passed,
    string FailureReasonsJson,
    string CorrelationId,
    string TenantId,
    DateTime CreatedAtUtc);

public sealed record AiGenerationSandboxReportRecord(
    Guid ReportId,
    Guid DraftId,
    bool Passed,
    string ExecutionBehavior,
    string PerformanceMetricsJson,
    string ConformanceCompliance,
    string CorrelationId,
    string TenantId,
    DateTime CreatedAtUtc);

public sealed record AiGenerationDecisionRecord(
    Guid DecisionId,
    Guid DraftId,
    string OperatorId,
    AiGenerationDecisionAction Action,
    string DecisionReason,
    string TelemetryEventName,
    string GovernanceDecisionId,
    string CorrelationId,
    string TenantId,
    DateTime CreatedAtUtc);

public sealed record AiCapabilityFactoryDashboard(
    IReadOnlyList<AiToolGenerationDraftRecord> DraftQueue,
    IReadOnlyList<AiGenerationValidationReportRecord> ValidationReports,
    IReadOnlyList<AiGenerationSandboxReportRecord> SandboxResults,
    IReadOnlyList<AiGenerationDecisionRecord> ApprovalWorkflow,
    IReadOnlyList<AiToolGenerationDraftRecord> GeneratedToolPerformance);

public sealed record AiDraftGenerationRequest(
    Guid SignalId,
    string ToolSlug,
    string ManifestJson,
    string InputSchemaJson,
    string OutputSchemaJson,
    string UiSchemaJson,
    string SeoContent,
    string ExampleUsage,
    string SafetyNotes,
    string GeneratedCapabilityClass,
    string SuggestedRuntimeLanguage,
    string RequiredPermissions,
    decimal DraftQualityScore,
    string RiskLevel,
    string CorrelationId,
    string TenantId);

public sealed record AiGenerationDecisionRequest(
    string OperatorId,
    AiGenerationDecisionAction Action,
    string DecisionReason,
    string CorrelationId,
    string TenantId,
    string? GovernanceDecisionId = null);
