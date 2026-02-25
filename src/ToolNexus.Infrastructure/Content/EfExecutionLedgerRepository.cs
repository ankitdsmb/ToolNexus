using Microsoft.EntityFrameworkCore;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Infrastructure.Data;

namespace ToolNexus.Infrastructure.Content;

public sealed class EfExecutionLedgerRepository(ToolNexusContentDbContext dbContext) : IExecutionLedgerRepository
{
    public async Task<ExecutionLedgerPage> GetExecutionsAsync(ExecutionLedgerQuery query, CancellationToken cancellationToken)
    {
        var baseQuery = dbContext.ExecutionRuns
            .AsNoTracking()
            .Include(x => x.Conformance)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.CorrelationId))
        {
            baseQuery = baseQuery.Where(x => x.CorrelationId == query.CorrelationId);
        }

        if (!string.IsNullOrWhiteSpace(query.TenantId))
        {
            baseQuery = baseQuery.Where(x => x.TenantId == query.TenantId);
        }

        if (!string.IsNullOrWhiteSpace(query.ToolId))
        {
            baseQuery = baseQuery.Where(x => x.ToolId == query.ToolId);
        }

        var total = await baseQuery.CountAsync(cancellationToken);
        var skip = (query.Page - 1) * query.PageSize;

        var items = await baseQuery
            .OrderByDescending(x => x.ExecutedAtUtc)
            .Skip(skip)
            .Take(query.PageSize)
            .Select(x => new ExecutionLedgerSummary(
                x.Id,
                x.ToolId,
                x.ExecutedAtUtc,
                x.Success,
                x.Authority,
                x.CorrelationId,
                x.TenantId,
                x.TraceId,
                x.Conformance.NormalizedStatus,
                x.Conformance.IsValid,
                x.Conformance.WasNormalized,
                x.Conformance.IssueCount))
            .ToListAsync(cancellationToken);

        return new ExecutionLedgerPage(query.Page, query.PageSize, total, items);
    }

    public async Task<ExecutionLedgerDetail?> GetExecutionByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        return await dbContext.ExecutionRuns
            .AsNoTracking()
            .Include(x => x.Snapshot)
            .Include(x => x.Conformance)
            .Include(x => x.AuthorityDecision)
            .Where(x => x.Id == id)
            .Select(x => new ExecutionLedgerDetail(
                x.Id,
                x.ToolId,
                x.ExecutedAtUtc,
                x.Success,
                x.DurationMs,
                x.ErrorType,
                x.PayloadSize,
                x.ExecutionMode,
                x.RuntimeLanguage,
                x.AdapterName,
                x.AdapterResolutionStatus,
                x.Capability,
                x.Authority,
                x.ShadowExecution,
                x.CorrelationId,
                x.TenantId,
                x.TraceId,
                new ExecutionLedgerSnapshot(
                    x.Snapshot.SnapshotId,
                    x.Snapshot.Authority,
                    x.Snapshot.RuntimeLanguage,
                    x.Snapshot.ExecutionCapability,
                    x.Snapshot.CorrelationId,
                    x.Snapshot.TenantId,
                    x.Snapshot.TimestampUtc,
                    x.Snapshot.ConformanceVersion,
                    x.Snapshot.PolicySnapshotJson,
                    x.Snapshot.GovernanceDecisionId),
                new ExecutionLedgerConformance(
                    x.Conformance.IsValid,
                    x.Conformance.NormalizedStatus,
                    x.Conformance.WasNormalized,
                    x.Conformance.IssueCount,
                    x.Conformance.IssuesJson),
                new ExecutionLedgerAuthorityDecision(
                    x.AuthorityDecision.Authority,
                    x.AuthorityDecision.AdmissionAllowed,
                    x.AuthorityDecision.AdmissionReason,
                    x.AuthorityDecision.DecisionSource)))
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<ExecutionLedgerSnapshot?> GetSnapshotByExecutionIdAsync(Guid id, CancellationToken cancellationToken)
    {
        return await dbContext.ExecutionSnapshots
            .AsNoTracking()
            .Where(x => x.ExecutionRunId == id)
            .Select(x => new ExecutionLedgerSnapshot(
                x.SnapshotId,
                x.Authority,
                x.RuntimeLanguage,
                x.ExecutionCapability,
                x.CorrelationId,
                x.TenantId,
                x.TimestampUtc,
                x.ConformanceVersion,
                x.PolicySnapshotJson,
                x.GovernanceDecisionId))
            .FirstOrDefaultAsync(cancellationToken);
    }
}
