using Microsoft.EntityFrameworkCore;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Infrastructure.Content.Entities;
using ToolNexus.Infrastructure.Data;

namespace ToolNexus.Infrastructure.Content;

public sealed class EfArchitectureEvolutionRepository(ToolNexusContentDbContext dbContext) : IArchitectureEvolutionRepository
{
    public async Task AddSignalAsync(ArchitectureEvolutionSignal signal, CancellationToken cancellationToken)
    {
        await dbContext.ArchitectureEvolutionSignals.AddAsync(new ArchitectureEvolutionSignalEntity
        {
            SignalId = signal.SignalId,
            SignalType = signal.SignalType,
            SourceDomain = signal.SourceDomain,
            SeverityScore = signal.SeverityScore,
            CorrelationId = signal.CorrelationId,
            TenantId = signal.TenantId,
            RuntimeIdentity = signal.RuntimeIdentity,
            DetectedAtUtc = signal.DetectedAtUtc,
            PayloadJson = signal.PayloadJson
        }, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<ArchitectureEvolutionSignal>> GetSignalsAsync(DateTime sinceUtc, CancellationToken cancellationToken)
        => await dbContext.ArchitectureEvolutionSignals.AsNoTracking().Where(x => x.DetectedAtUtc >= sinceUtc)
            .OrderByDescending(x => x.DetectedAtUtc)
            .Select(x => new ArchitectureEvolutionSignal(x.SignalId, x.SignalType, x.SourceDomain, x.SeverityScore, x.CorrelationId, x.TenantId, x.RuntimeIdentity, x.DetectedAtUtc, x.PayloadJson))
            .ToListAsync(cancellationToken);

    public async Task UpsertDriftReportAsync(ArchitectureDriftReport driftReport, CancellationToken cancellationToken)
    {
        await dbContext.ArchitectureDriftReports.AddAsync(new ArchitectureDriftReportEntity
        {
            DriftReportId = driftReport.DriftReportId,
            DriftType = driftReport.DriftType,
            AffectedDomain = driftReport.AffectedDomain,
            DriftScore = driftReport.DriftScore,
            RiskLevel = driftReport.RiskLevel,
            CorrelationId = driftReport.CorrelationId,
            TenantId = driftReport.TenantId,
            Summary = driftReport.Summary,
            IndicatorsJson = driftReport.IndicatorsJson,
            DetectedAtUtc = driftReport.DetectedAtUtc
        }, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<ArchitectureDriftReport>> GetLatestDriftReportsAsync(int limit, CancellationToken cancellationToken)
        => await dbContext.ArchitectureDriftReports.AsNoTracking().OrderByDescending(x => x.DetectedAtUtc).Take(limit)
            .Select(x => new ArchitectureDriftReport(x.DriftReportId, x.DriftType, x.AffectedDomain, x.DriftScore, x.RiskLevel, x.CorrelationId, x.TenantId, x.Summary, x.IndicatorsJson, x.DetectedAtUtc))
            .ToListAsync(cancellationToken);

    public async Task AddRecommendationAsync(EvolutionRecommendation recommendation, CancellationToken cancellationToken)
    {
        await dbContext.EvolutionRecommendations.AddAsync(new EvolutionRecommendationEntity
        {
            RecommendationId = recommendation.RecommendationId,
            AffectedDomain = recommendation.AffectedDomain,
            ArchitectureImpactLevel = recommendation.ArchitectureImpactLevel,
            RiskLevel = recommendation.RiskLevel,
            ConfidenceScore = recommendation.ConfidenceScore,
            EstimatedMigrationCost = recommendation.EstimatedMigrationCost,
            ExpectedPlatformBenefit = recommendation.ExpectedPlatformBenefit,
            BackwardCompatibilityImpact = recommendation.BackwardCompatibilityImpact,
            SuggestedPhases = recommendation.SuggestedPhases,
            RollbackStrategy = recommendation.RollbackStrategy,
            CorrelationId = recommendation.CorrelationId,
            TenantId = recommendation.TenantId,
            GeneratedAtUtc = recommendation.GeneratedAtUtc,
            Status = recommendation.Status
        }, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<EvolutionRecommendation>> GetPendingRecommendationsAsync(int limit, CancellationToken cancellationToken)
        => await dbContext.EvolutionRecommendations.AsNoTracking().Where(x => x.Status.Contains("pending"))
            .OrderByDescending(x => x.GeneratedAtUtc).Take(limit)
            .Select(x => new EvolutionRecommendation(x.RecommendationId, x.AffectedDomain, x.ArchitectureImpactLevel, x.RiskLevel, x.ConfidenceScore, x.EstimatedMigrationCost, x.ExpectedPlatformBenefit, x.BackwardCompatibilityImpact, x.SuggestedPhases, x.RollbackStrategy, x.CorrelationId, x.TenantId, x.GeneratedAtUtc, x.Status))
            .ToListAsync(cancellationToken);

    public async Task AddSimulationReportAsync(EvolutionSimulationReport report, CancellationToken cancellationToken)
    {
        await dbContext.EvolutionSimulationReports.AddAsync(new EvolutionSimulationReportEntity
        {
            SimulationReportId = report.SimulationReportId,
            RecommendationId = report.RecommendationId,
            ExecutionFlowImpact = report.ExecutionFlowImpact,
            GovernanceFlowImpact = report.GovernanceFlowImpact,
            DataModelImpact = report.DataModelImpact,
            MigrationComplexity = report.MigrationComplexity,
            Summary = report.Summary,
            SimulatedAtUtc = report.SimulatedAtUtc
        }, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<EvolutionSimulationReport?> GetLatestSimulationByRecommendationAsync(Guid recommendationId, CancellationToken cancellationToken)
        => await dbContext.EvolutionSimulationReports.AsNoTracking().Where(x => x.RecommendationId == recommendationId)
            .OrderByDescending(x => x.SimulatedAtUtc)
            .Select(x => new EvolutionSimulationReport(x.SimulationReportId, x.RecommendationId, x.ExecutionFlowImpact, x.GovernanceFlowImpact, x.DataModelImpact, x.MigrationComplexity, x.Summary, x.SimulatedAtUtc))
            .FirstOrDefaultAsync(cancellationToken);

    public async Task RecordArchitectDecisionAsync(ArchitectDecision decision, CancellationToken cancellationToken)
    {
        await dbContext.ArchitectDecisions.AddAsync(new ArchitectDecisionEntity
        {
            DecisionId = decision.DecisionId,
            RecommendationId = decision.RecommendationId,
            Action = decision.Action,
            ArchitectId = decision.ArchitectId,
            Notes = decision.Notes,
            CorrelationId = decision.CorrelationId,
            TenantId = decision.TenantId,
            DecisionedAtUtc = decision.DecisionedAtUtc
        }, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public Task<bool> ExistsRecommendationAsync(Guid recommendationId, CancellationToken cancellationToken)
        => dbContext.EvolutionRecommendations.AnyAsync(x => x.RecommendationId == recommendationId, cancellationToken);

    public async Task UpdateRecommendationStatusAsync(Guid recommendationId, string status, CancellationToken cancellationToken)
    {
        var recommendation = await dbContext.EvolutionRecommendations.FirstOrDefaultAsync(x => x.RecommendationId == recommendationId, cancellationToken);
        if (recommendation is null)
        {
            return;
        }

        recommendation.Status = status;
        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
