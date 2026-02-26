namespace ToolNexus.Application.Models;

public sealed record ExecutionHealthSummary(
    long PendingItems,
    long RetryCount,
    long DeadLetterCount,
    double? OldestPendingAgeMinutes,
    bool BacklogIncreasing,
    bool HasDeadLetters);

public sealed record ExecutionWorkerStatus(
    string WorkerInstanceId,
    DateTime? LastHeartbeatUtc,
    int ActiveJobs,
    int RecentErrors,
    bool IsStale);

public sealed record ExecutionWorkersResponse(IReadOnlyList<ExecutionWorkerStatus> Workers);

public sealed record ExecutionIncident(
    string EventType,
    string Severity,
    string Destination,
    DateTime OccurredAtUtc,
    string Summary,
    int AttemptCount);

public sealed record ExecutionIncidentPage(
    int Page,
    int PageSize,
    int TotalItems,
    IReadOnlyList<ExecutionIncident> Items);

public sealed record ExecutionStreamItem(
    Guid ExecutionRunId,
    string ToolId,
    string Authority,
    string Adapter,
    string RuntimeIdentity,
    string GovernanceResult,
    string Status,
    long DurationMs,
    DateTime ExecutedAtUtc);

public sealed record GovernanceVisibilitySummary(
    int ApprovedDecisions,
    int BlockedExecutions,
    int RequiresApproval,
    IReadOnlyDictionary<string, int> RiskTierDistribution);

public sealed record CapabilityLifecycleSummary(
    int Draft,
    int Review,
    int Approved,
    int Active,
    int Deprecated);

public sealed record QualityIntelligenceSummary(
    decimal AverageQualityScore,
    int ConformanceFailures,
    int RuntimeInstabilitySignals,
    int AnomalyAlerts);

public sealed record OperatorCommandCenterSnapshot(
    ExecutionHealthSummary Health,
    ExecutionWorkersResponse Workers,
    ExecutionIncidentPage Incidents,
    IReadOnlyList<ExecutionStreamItem> Stream,
    GovernanceVisibilitySummary Governance,
    CapabilityLifecycleSummary CapabilityLifecycle,
    QualityIntelligenceSummary Quality);

public sealed record OperatorCommandRequest(
    string Reason,
    string ImpactScope,
    string AuthorityContext,
    string? TargetExecutionId,
    string? RollbackPlan);


public sealed record AutonomousInsightItem(
    Guid InsightId,
    IReadOnlyList<Guid> RelatedSignalIds,
    string ProposedAction,
    string ImpactScope,
    decimal RiskScore,
    decimal ConfidenceScore,
    string CorrelationId,
    string AuthorityContext,
    DateTime CreatedAtUtc,
    string Status);

public sealed record AutonomousInsightsPanel(IReadOnlyList<AutonomousInsightItem> Items);

public sealed record AutonomousInsightDecisionRequest(
    string OperatorId,
    string AuthorityContext,
    string? Notes);

public static class OptimizationDomains
{
    public const string Runtime = "runtime";
    public const string Governance = "governance";
    public const string Ux = "ux";
    public const string Quality = "quality";
    public const string AiCapability = "ai-capability";
}

public sealed record OptimizationRecommendationItem(
    Guid RecommendationId,
    string Domain,
    string TargetNodeId,
    string Reason,
    decimal ConfidenceScore,
    string SuggestedChange,
    string RiskImpact,
    string ExpectedBenefit,
    string CorrelationId,
    string TenantId,
    string RollbackMetadata,
    DateTime GeneratedAtUtc,
    string Status);

public sealed record OptimizationSimulationResult(
    Guid SimulationId,
    Guid RecommendationId,
    string Summary,
    decimal ProjectedRiskDelta,
    decimal ProjectedBenefitDelta,
    bool ApprovedForReview,
    DateTime SimulatedAtUtc);

public sealed record OptimizationRecommendationDetail(
    OptimizationRecommendationItem Recommendation,
    OptimizationSimulationResult? LatestSimulation);

public sealed record OptimizationDashboard(
    IReadOnlyList<OptimizationRecommendationDetail> RuntimeRecommendations,
    IReadOnlyList<OptimizationRecommendationDetail> GovernanceOptimization,
    IReadOnlyList<OptimizationRecommendationDetail> UxOptimization,
    IReadOnlyList<OptimizationRecommendationDetail> QualityOptimization,
    IReadOnlyList<OptimizationRecommendationDetail> AiGenerationImprovements);

public sealed record OptimizationDecisionRequest(
    string OperatorId,
    string AuthorityContext,
    string? Notes,
    DateTime? ScheduledForUtc);
