using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ToolNexus.Application.Models;
using ToolNexus.Application.Options;

namespace ToolNexus.Application.Services;

public sealed class ArchitectureEvolutionService(
    IArchitectureEvolutionRepository repository,
    IOptions<ArchitectureEvolutionOptions> options,
    ILogger<ArchitectureEvolutionService> logger) : IArchitectureEvolutionService
{
    public async Task<ArchitectureEvolutionSignal> IngestSignalAsync(EvolutionSignalIngestRequest request, CancellationToken cancellationToken)
    {
        var signal = new ArchitectureEvolutionSignal(
            Guid.NewGuid(),
            request.SignalType,
            request.SourceDomain,
            request.SeverityScore,
            request.CorrelationId,
            request.TenantId,
            request.RuntimeIdentity,
            request.DetectedAtUtc ?? DateTime.UtcNow,
            request.PayloadJson);

        await repository.AddSignalAsync(signal, cancellationToken);
        logger.LogInformation("evolution.signal.ingested correlation={CorrelationId} tenant={TenantId} source={SourceDomain}", signal.CorrelationId, signal.TenantId, signal.SourceDomain);
        return signal;
    }

    public async Task<int> RunDriftDetectionAsync(CancellationToken cancellationToken)
    {
        var config = options.Value;
        var signals = await repository.GetSignalsAsync(DateTime.UtcNow.AddHours(-config.LookbackHours), cancellationToken);
        var driftReports = signals
            .GroupBy(x => x.SourceDomain)
            .Select(group =>
            {
                var driftScore = group.Average(x => x.SeverityScore);
                if (driftScore < config.DriftDetectionThreshold)
                {
                    return null;
                }

                var driftType = ResolveDriftType(group.Key);
                return new ArchitectureDriftReport(
                    Guid.NewGuid(),
                    driftType,
                    group.Key,
                    driftScore,
                    driftScore >= 0.85m ? "high" : "medium",
                    group.Last().CorrelationId,
                    group.Last().TenantId,
                    $"Detected {driftType} drift in {group.Key} domain.",
                    $"{{\"sampleCount\":{group.Count()},\"averageSeverity\":{driftScore:F3}}}",
                    DateTime.UtcNow);
            })
            .Where(x => x is not null)
            .Cast<ArchitectureDriftReport>()
            .ToList();

        foreach (var driftReport in driftReports)
        {
            await repository.UpsertDriftReportAsync(driftReport, cancellationToken);
            logger.LogInformation("evolution.drift.detected report={DriftReportId} domain={Domain} risk={RiskLevel} correlation={CorrelationId}", driftReport.DriftReportId, driftReport.AffectedDomain, driftReport.RiskLevel, driftReport.CorrelationId);
        }

        return driftReports.Count;
    }

    public async Task<int> GenerateRecommendationsAsync(CancellationToken cancellationToken)
    {
        var drifts = await repository.GetLatestDriftReportsAsync(100, cancellationToken);
        var generated = 0;

        foreach (var drift in drifts)
        {
            var confidence = Math.Clamp(drift.DriftScore - 0.1m, 0.5m, 0.95m);
            if (confidence < options.Value.RecommendationConfidenceThreshold)
            {
                continue;
            }

            var recommendation = new EvolutionRecommendation(
                Guid.NewGuid(),
                drift.AffectedDomain,
                drift.DriftScore >= 0.85m ? "high" : "moderate",
                drift.RiskLevel,
                confidence,
                decimal.Round(50m + (drift.DriftScore * 100m), 2),
                decimal.Round(60m + (confidence * 100m), 2),
                drift.DriftScore >= 0.9m ? "requires phased compatibility shims" : "fully backward compatible if phased",
                "Phase 1: baseline; Phase 2: adapter abstraction; Phase 3: migration readiness; Phase 4: controlled rollout; Phase 5: debt burn-down",
                "Maintain prior contracts behind compatibility adapters and rollback to previous approved runtime topology.",
                drift.CorrelationId,
                drift.TenantId,
                DateTime.UtcNow,
                "pending-simulation");

            var simulation = new EvolutionSimulationReport(
                Guid.NewGuid(),
                recommendation.RecommendationId,
                decimal.Round(drift.DriftScore * 0.9m, 4),
                decimal.Round(drift.DriftScore * 0.8m, 4),
                decimal.Round(drift.DriftScore * 0.7m, 4),
                decimal.Round((1m - confidence) + 0.25m, 4),
                "Simulation completed for execution, governance, data model, and migration complexity.",
                DateTime.UtcNow);

            await repository.AddRecommendationAsync(recommendation, cancellationToken);
            await repository.AddSimulationReportAsync(simulation, cancellationToken);
            await repository.UpdateRecommendationStatusAsync(recommendation.RecommendationId, "pending-review", cancellationToken);

            logger.LogInformation("evolution.simulation.completed recommendation={RecommendationId} correlation={CorrelationId}", recommendation.RecommendationId, recommendation.CorrelationId);
            logger.LogInformation("evolution.recommendation.generated recommendation={RecommendationId} domain={Domain} correlation={CorrelationId}", recommendation.RecommendationId, recommendation.AffectedDomain, recommendation.CorrelationId);
            generated++;
        }

        return generated;
    }

    public async Task<EvolutionDashboard> GetDashboardAsync(int limit, CancellationToken cancellationToken)
    {
        var safeLimit = Math.Clamp(limit, 1, 100);
        var drifts = await repository.GetLatestDriftReportsAsync(safeLimit, cancellationToken);
        var recommendations = await repository.GetPendingRecommendationsAsync(safeLimit, cancellationToken);
        var simulationReports = new List<EvolutionSimulationReport>();
        foreach (var recommendation in recommendations)
        {
            var report = await repository.GetLatestSimulationByRecommendationAsync(recommendation.RecommendationId, cancellationToken);
            if (report is not null)
            {
                simulationReports.Add(report);
            }
        }

        var growthForecast = recommendations.OrderByDescending(x => x.ExpectedPlatformBenefit).Take(Math.Max(3, safeLimit / 3)).ToList();
        var debtTracker = drifts.OrderByDescending(x => x.DriftScore).Take(Math.Max(3, safeLimit / 3)).ToList();

        return new EvolutionDashboard(drifts, recommendations, simulationReports, growthForecast, debtTracker);
    }

    public async Task<bool> RecordArchitectDecisionAsync(Guid recommendationId, ArchitectDecisionRequest request, CancellationToken cancellationToken)
    {
        if (!await repository.ExistsRecommendationAsync(recommendationId, cancellationToken))
        {
            return false;
        }

        var action = request.Action.ToLowerInvariant();
        if (action is not ("approve-roadmap" or "reject-recommendation" or "future-review"))
        {
            return false;
        }

        var decision = new ArchitectDecision(Guid.NewGuid(), recommendationId, action, request.ArchitectId, request.Notes, request.CorrelationId, request.TenantId, DateTime.UtcNow);
        await repository.RecordArchitectDecisionAsync(decision, cancellationToken);
        await repository.UpdateRecommendationStatusAsync(recommendationId, action, cancellationToken);
        logger.LogInformation("evolution.reviewed recommendation={RecommendationId} action={Action}", recommendationId, action);
        if (action == "approve-roadmap")
        {
            logger.LogInformation("evolution.accepted recommendation={RecommendationId}", recommendationId);
        }
        else if (action == "reject-recommendation")
        {
            logger.LogInformation("evolution.rejected recommendation={RecommendationId}", recommendationId);
        }

        return true;
    }

    private static string ResolveDriftType(string sourceDomain)
        => sourceDomain switch
        {
            EvolutionDomains.ExecutionLayer => "runtime-authority-imbalance",
            EvolutionDomains.Governance => "governance-bottleneck",
            EvolutionDomains.CapabilityModel => "duplicated-capability-pattern",
            EvolutionDomains.UxSystem => "tooling-ecosystem-fragmentation",
            EvolutionDomains.PlatformArchitecture => "rising-maintenance-cost",
            _ => "adapter-complexity"
        };
}
