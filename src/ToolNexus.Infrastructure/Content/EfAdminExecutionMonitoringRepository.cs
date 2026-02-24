using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using ToolNexus.Application.Services;
using ToolNexus.Infrastructure.Data;

namespace ToolNexus.Infrastructure.Content;

public sealed class EfAdminExecutionMonitoringRepository(ToolNexusContentDbContext dbContext) : IAdminExecutionMonitoringRepository
{
    private static readonly string[] PendingStates = ["pending", "retry_wait", "in_progress"];

    public async Task<ExecutionHealthSummarySnapshot> GetHealthSnapshotAsync(CancellationToken cancellationToken)
    {
        if (!await EnsureAuditSchemaAvailableAsync(cancellationToken))
        {
            return new ExecutionHealthSummarySnapshot(0, 0, 0, null, 0, 0);
        }

        return await ExecuteWithSchemaRecoveryAsync(async () =>
        {
            var now = DateTime.UtcNow;
            var recentWindowStart = now.AddMinutes(-10);
            var previousWindowStart = now.AddMinutes(-20);

            var pendingItems = await dbContext.AuditOutbox.LongCountAsync(x => PendingStates.Contains(x.DeliveryState), cancellationToken);
            var retryCount = await dbContext.AuditOutbox.LongCountAsync(x => x.DeliveryState == "retry_wait", cancellationToken);
            var deadLetterCount = await dbContext.AuditDeadLetters.LongCountAsync(x => x.OperatorStatus == "open", cancellationToken);
            var oldestPending = await dbContext.AuditOutbox
                .AsNoTracking()
                .Where(x => PendingStates.Contains(x.DeliveryState))
                .OrderBy(x => x.CreatedAtUtc)
                .Select(x => (DateTime?)x.CreatedAtUtc)
                .FirstOrDefaultAsync(cancellationToken);
            var recentBacklog = await dbContext.AuditOutbox.LongCountAsync(x => PendingStates.Contains(x.DeliveryState) && x.CreatedAtUtc >= recentWindowStart, cancellationToken);
            var previousBacklog = await dbContext.AuditOutbox.LongCountAsync(x => PendingStates.Contains(x.DeliveryState) && x.CreatedAtUtc >= previousWindowStart && x.CreatedAtUtc < recentWindowStart, cancellationToken);

            return new ExecutionHealthSummarySnapshot(
                pendingItems,
                retryCount,
                deadLetterCount,
                oldestPending,
                recentBacklog,
                previousBacklog);
        }, cancellationToken);
    }

    public async Task<IReadOnlyList<ExecutionWorkerSnapshot>> GetWorkerSnapshotsAsync(DateTime utcNow, CancellationToken cancellationToken)
    {
        if (!await EnsureAuditSchemaAvailableAsync(cancellationToken))
        {
            return [];
        }

        return await ExecuteWithSchemaRecoveryAsync(async () =>
        {
            var leases = await dbContext.AuditOutbox
                .AsNoTracking()
                .Where(x => x.DeliveryState == "in_progress" && x.LeaseOwner != null)
                .GroupBy(x => x.LeaseOwner!)
                .Select(g => new
                {
                    WorkerInstanceId = g.Key,
                    LastLeaseExpiry = g.Max(x => x.LeaseExpiresAtUtc),
                    ActiveJobs = g.Count(),
                    RecentErrors = g.Count(x => x.LastAttemptAtUtc != null && x.LastAttemptAtUtc >= utcNow.AddMinutes(-30) && x.LastErrorCode != null)
                })
                .OrderBy(x => x.WorkerInstanceId)
                .ToListAsync(cancellationToken);

            return leases.Select(x => new ExecutionWorkerSnapshot(
                x.WorkerInstanceId,
                x.LastLeaseExpiry,
                x.ActiveJobs,
                x.RecentErrors,
                x.LastLeaseExpiry is null || x.LastLeaseExpiry < utcNow)).ToList();
        }, cancellationToken);
    }

    public async Task<ExecutionIncidentSnapshotPage> GetIncidentSnapshotsAsync(int page, int pageSize, CancellationToken cancellationToken)
    {
        var auditAvailable = await EnsureAuditSchemaAvailableAsync(cancellationToken);
        var runtimeIncidentsAvailable = await EnsureRuntimeIncidentSchemaAvailableAsync(cancellationToken);

        return await ExecuteWithSchemaRecoveryAsync(async () =>
        {
            var skip = (page - 1) * pageSize;

            var retryCount = 0L;
            var failureCount = 0L;
            var deadLetterCount = 0L;
            var runtimeCount = 0L;
            List<ExecutionIncidentSnapshot> retryEvents = [];
            List<ExecutionIncidentSnapshot> deadLetterEvents = [];
            List<ExecutionIncidentSnapshot> failureEvents = [];
            List<ExecutionIncidentSnapshot> runtimeEvents = [];

            if (auditAvailable)
            {
                retryCount = await dbContext.AuditOutbox.LongCountAsync(x => x.DeliveryState == "retry_wait" && x.LastAttemptAtUtc != null, cancellationToken);
                failureCount = await dbContext.AuditOutbox.LongCountAsync(x => x.DeliveryState != "retry_wait" && x.LastAttemptAtUtc != null && x.LastErrorCode != null, cancellationToken);
                deadLetterCount = await dbContext.AuditDeadLetters.LongCountAsync(cancellationToken);

                retryEvents = await dbContext.AuditOutbox
                    .AsNoTracking()
                    .Where(x => x.DeliveryState == "retry_wait" && x.LastAttemptAtUtc != null)
                    .OrderByDescending(x => x.LastAttemptAtUtc)
                    .Take(skip + pageSize)
                    .Select(x => new ExecutionIncidentSnapshot(
                        "retry",
                        "warning",
                        x.Destination,
                        x.LastAttemptAtUtc!.Value,
                        x.LastErrorCode ?? "retry_scheduled",
                        x.AttemptCount))
                    .ToListAsync(cancellationToken);

                deadLetterEvents = await dbContext.AuditDeadLetters
                    .AsNoTracking()
                    .OrderByDescending(x => x.DeadLetteredAtUtc)
                    .Take(skip + pageSize)
                    .Select(x => new ExecutionIncidentSnapshot(
                        "dead_letter",
                        "critical",
                        x.Destination,
                        x.DeadLetteredAtUtc,
                        x.ErrorSummary,
                        x.FinalAttemptCount))
                    .ToListAsync(cancellationToken);

                failureEvents = await dbContext.AuditOutbox
                    .AsNoTracking()
                    .Where(x => x.DeliveryState != "retry_wait" && x.LastAttemptAtUtc != null && x.LastErrorCode != null)
                    .OrderByDescending(x => x.LastAttemptAtUtc)
                    .Take(skip + pageSize)
                    .Select(x => new ExecutionIncidentSnapshot(
                        "failure",
                        "critical",
                        x.Destination,
                        x.LastAttemptAtUtc!.Value,
                        x.LastErrorCode!,
                        x.AttemptCount))
                    .ToListAsync(cancellationToken);
            }

            if (runtimeIncidentsAvailable)
            {
                runtimeCount = await dbContext.RuntimeIncidents.LongCountAsync(cancellationToken);
                runtimeEvents = await dbContext.RuntimeIncidents
                    .AsNoTracking()
                    .OrderByDescending(x => x.LastOccurredUtc)
                    .Take(skip + pageSize)
                    .Select(x => new ExecutionIncidentSnapshot(
                        "runtime_incident",
                        x.Severity,
                        x.ToolSlug,
                        x.LastOccurredUtc,
                        x.Message,
                        x.Count))
                    .ToListAsync(cancellationToken);
            }

            var total = checked((int)Math.Min(int.MaxValue, retryCount + failureCount + deadLetterCount + runtimeCount));
            var items = retryEvents
                .Concat(failureEvents)
                .Concat(deadLetterEvents)
                .Concat(runtimeEvents)
                .OrderByDescending(x => x.OccurredAtUtc)
                .Skip(skip)
                .Take(pageSize)
                .ToList();

            return new ExecutionIncidentSnapshotPage(page, pageSize, total, items);
        }, cancellationToken);
    }


    private async Task<bool> EnsureRuntimeIncidentSchemaAvailableAsync(CancellationToken cancellationToken)
    {
        return await CanQueryRuntimeIncidentSchemaAsync(cancellationToken);
    }

    private async Task<bool> CanQueryRuntimeIncidentSchemaAsync(CancellationToken cancellationToken)
    {
        try
        {
            _ = await dbContext.RuntimeIncidents.AsNoTracking().Select(x => x.Id).Take(1).AnyAsync(cancellationToken);
            return true;
        }
        catch (PostgresException ex) when (ex.SqlState is PostgresErrorCodes.UndefinedTable or PostgresErrorCodes.UndefinedColumn)
        {
            return false;
        }
        catch (SqliteException ex) when (ex.SqliteErrorCode == 1
                                         && (ex.Message.Contains("no such table", StringComparison.OrdinalIgnoreCase)
                                             || ex.Message.Contains("no such column", StringComparison.OrdinalIgnoreCase)))
        {
            return false;
        }
    }
    private async Task<bool> EnsureAuditSchemaAvailableAsync(CancellationToken cancellationToken)
    {
        return await CanQueryAuditSchemaAsync(cancellationToken);
    }

    private async Task<bool> CanQueryAuditSchemaAsync(CancellationToken cancellationToken)
    {
        try
        {
            _ = await dbContext.AuditOutbox.AsNoTracking().Select(x => x.Id).Take(1).AnyAsync(cancellationToken);
            _ = await dbContext.AuditDeadLetters.AsNoTracking().Select(x => x.Id).Take(1).AnyAsync(cancellationToken);
            return true;
        }
        catch (PostgresException ex) when (ex.SqlState is PostgresErrorCodes.UndefinedTable or PostgresErrorCodes.UndefinedColumn)
        {
            return false;
        }
        catch (SqliteException ex) when (ex.SqliteErrorCode == 1
                                         && (ex.Message.Contains("no such table", StringComparison.OrdinalIgnoreCase)
                                             || ex.Message.Contains("no such column", StringComparison.OrdinalIgnoreCase)))
        {
            return false;
        }
    }

    private async Task<T> ExecuteWithSchemaRecoveryAsync<T>(Func<Task<T>> action, CancellationToken cancellationToken)
    {
        try
        {
            return await action();
        }
        catch (PostgresException ex) when (ex.SqlState is PostgresErrorCodes.UndefinedTable or PostgresErrorCodes.UndefinedColumn)
        {
            throw new InvalidOperationException("Audit monitoring schema is not ready.", ex);
        }
        catch (SqliteException ex) when (ex.SqliteErrorCode == 1
                                         && (ex.Message.Contains("no such table", StringComparison.OrdinalIgnoreCase)
                                             || ex.Message.Contains("no such column", StringComparison.OrdinalIgnoreCase)))
        {
            throw new InvalidOperationException("Audit monitoring schema is not ready.", ex);
        }
    }
}
