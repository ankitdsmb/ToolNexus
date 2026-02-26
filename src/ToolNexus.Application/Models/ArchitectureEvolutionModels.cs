namespace ToolNexus.Application.Models;

public static class EvolutionDomains
{
    public const string ExecutionLayer = "execution-layer";
    public const string Governance = "governance";
    public const string CapabilityModel = "capability-model";
    public const string UxSystem = "ux-system";
    public const string PlatformArchitecture = "platform-architecture";
}

public sealed record ArchitectureEvolutionSignal(
    Guid SignalId,
    string SignalType,
    string SourceDomain,
    decimal SeverityScore,
    string CorrelationId,
    string TenantId,
    string RuntimeIdentity,
    DateTime DetectedAtUtc,
    string PayloadJson);

public sealed record ArchitectureDriftReport(
    Guid DriftReportId,
    string DriftType,
    string AffectedDomain,
    decimal DriftScore,
    string RiskLevel,
    string CorrelationId,
    string TenantId,
    string Summary,
    string IndicatorsJson,
    DateTime DetectedAtUtc);

public sealed record EvolutionRecommendation(
    Guid RecommendationId,
    string AffectedDomain,
    string ArchitectureImpactLevel,
    string RiskLevel,
    decimal ConfidenceScore,
    decimal EstimatedMigrationCost,
    decimal ExpectedPlatformBenefit,
    string BackwardCompatibilityImpact,
    string SuggestedPhases,
    string RollbackStrategy,
    string CorrelationId,
    string TenantId,
    DateTime GeneratedAtUtc,
    string Status);

public sealed record EvolutionSimulationReport(
    Guid SimulationReportId,
    Guid RecommendationId,
    decimal ExecutionFlowImpact,
    decimal GovernanceFlowImpact,
    decimal DataModelImpact,
    decimal MigrationComplexity,
    string Summary,
    DateTime SimulatedAtUtc);

public sealed record ArchitectDecision(
    Guid DecisionId,
    Guid RecommendationId,
    string Action,
    string ArchitectId,
    string Notes,
    string CorrelationId,
    string TenantId,
    DateTime DecisionedAtUtc);

public sealed record EvolutionDashboard(
    IReadOnlyList<ArchitectureDriftReport> DriftAlerts,
    IReadOnlyList<EvolutionRecommendation> EvolutionSuggestions,
    IReadOnlyList<EvolutionSimulationReport> SimulationReports,
    IReadOnlyList<EvolutionRecommendation> GrowthForecast,
    IReadOnlyList<ArchitectureDriftReport> ArchitecturalDebtTracker);

public sealed record EvolutionSignalIngestRequest(
    string SignalType,
    string SourceDomain,
    decimal SeverityScore,
    string CorrelationId,
    string TenantId,
    string RuntimeIdentity,
    string PayloadJson,
    DateTime? DetectedAtUtc);

public sealed record ArchitectDecisionRequest(
    string Action,
    string ArchitectId,
    string Notes,
    string CorrelationId,
    string TenantId);
