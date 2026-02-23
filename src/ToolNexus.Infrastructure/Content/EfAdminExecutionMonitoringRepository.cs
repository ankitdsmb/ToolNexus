using Microsoft.EntityFrameworkCore;
using ToolNexus.Application.Services;
using ToolNexus.Infrastructure.Data;

namespace ToolNexus.Infrastructure.Content;

public sealed class EfAdminExecutionMonitoringRepository(ToolNexusContentDbContext dbContext) : IAdminExecutionMonitoringRepository
{
    private static readonly string[] PendingStates = ["pending", "retry_wait", "in_progress"];

    public async Task<ExecutionHealthSummarySnapshot> GetHealthSnapshotAsync(CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var recentWindowStart = now.AddMinutes(-10);
        var previousWindowStart = now.AddMinutes(-20);

        var pendingItemsTask = dbContext.AuditOutbox.LongCountAsync(x => PendingStates.Contains(x.DeliveryState), cancellationToken);
        var retryCountTask = dbContext.AuditOutbox.LongCountAsync(x => x.DeliveryState == "retry_wait", cancellationToken);
        var deadLetterCountTask = dbContext.AuditDeadLetters.LongCountAsync(x => x.OperatorStatus == "open", cancellationToken);
        var oldestPendingTask = dbContext.AuditOutbox
            .AsNoTracking()
            .Where(x => PendingStates.Contains(x.DeliveryState))
            .OrderBy(x => x.CreatedAtUtc)
            .Select(x => (DateTime?)x.CreatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);
        var recentBacklogTask = dbContext.AuditOutbox.LongCountAsync(x => PendingStates.Contains(x.DeliveryState) && x.CreatedAtUtc >= recentWindowStart, cancellationToken);
        var previousBacklogTask = dbContext.AuditOutbox.LongCountAsync(x => PendingStates.Contains(x.DeliveryState) && x.CreatedAtUtc >= previousWindowStart && x.CreatedAtUtc < recentWindowStart, cancellationToken);

        await Task.WhenAll(pendingItemsTask, retryCountTask, deadLetterCountTask, oldestPendingTask, recentBacklogTask, previousBacklogTask);

        return new ExecutionHealthSummarySnapshot(
            pendingItemsTask.Result,
            retryCountTask.Result,
            deadLetterCountTask.Result,
            oldestPendingTask.Result,
            recentBacklogTask.Result,
            previousBacklogTask.Result);
    }

    public async Task<IReadOnlyList<ExecutionWorkerSnapshot>> GetWorkerSnapshotsAsync(DateTime utcNow, CancellationToken cancellationToken)
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
    }

    public async Task<ExecutionIncidentSnapshotPage> GetIncidentSnapshotsAsync(int page, int pageSize, CancellationToken cancellationToken)
    {
        var skip = (page - 1) * pageSize;

        var retryCountTask = dbContext.AuditOutbox.LongCountAsync(x => x.DeliveryState == "retry_wait" && x.LastAttemptAtUtc != null, cancellationToken);
        var failureCountTask = dbContext.AuditOutbox.LongCountAsync(x => x.DeliveryState != "retry_wait" && x.LastAttemptAtUtc != null && x.LastErrorCode != null, cancellationToken);
        var deadLetterCountTask = dbContext.AuditDeadLetters.LongCountAsync(cancellationToken);

        var retryEventsTask = dbContext.AuditOutbox
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

        var deadLetterEventsTask = dbContext.AuditDeadLetters
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

        var failureEventsTask = dbContext.AuditOutbox
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

        await Task.WhenAll(retryCountTask, failureCountTask, deadLetterCountTask, retryEventsTask, failureEventsTask, deadLetterEventsTask);

        var total = checked((int)Math.Min(int.MaxValue, retryCountTask.Result + failureCountTask.Result + deadLetterCountTask.Result));
        var items = retryEventsTask.Result
            .Concat(failureEventsTask.Result)
            .Concat(deadLetterEventsTask.Result)
            .OrderByDescending(x => x.OccurredAtUtc)
            .Skip(skip)
            .Take(pageSize)
            .ToList();

        return new ExecutionIncidentSnapshotPage(page, pageSize, total, items);
    }
}
