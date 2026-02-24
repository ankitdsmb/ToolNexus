using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ToolNexus.Application.Services;
using ToolNexus.Infrastructure.Content.Entities;
using ToolNexus.Infrastructure.Data;
using ToolNexus.Infrastructure.Options;

namespace ToolNexus.Infrastructure.Content;

public interface IAuditOutboxDestinationClient
{
    Task<AuditDeliveryResult> DeliverAsync(AuditEventEntity auditEvent, string destination, string idempotencyKey, CancellationToken cancellationToken);
}

public sealed record AuditDeliveryResult(bool Success, bool Retryable, string? ErrorCode = null, string? ErrorMessage = null);

public sealed class NoopAuditOutboxDestinationClient : IAuditOutboxDestinationClient
{
    public Task<AuditDeliveryResult> DeliverAsync(AuditEventEntity auditEvent, string destination, string idempotencyKey, CancellationToken cancellationToken)
        => Task.FromResult(new AuditDeliveryResult(true, false));
}

public sealed class AuditOutboxWorker(
    IServiceScopeFactory scopeFactory,
    IDatabaseInitializationState initializationState,
    IOptions<AuditGuardrailsOptions> options,
    AuditGuardrailsMetrics metrics,
    ILogger<AuditOutboxWorker> logger) : BackgroundService
{
    private const int MaxAttempts = 12;
    private readonly string workerId = $"audit-worker-{Environment.MachineName}-{Guid.NewGuid():N}";
    private static readonly Random Jitter = new();

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("Audit outbox worker waiting for database initialization readiness.");
        await initializationState.WaitForReadyAsync(stoppingToken);
        logger.LogInformation("Audit outbox worker detected database readiness and is starting.");

        while (!stoppingToken.IsCancellationRequested)
        {
            if (!options.Value.WorkerEnabled)
            {
                await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
                continue;
            }

            try
            {
                using var scope = scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<ToolNexusContentDbContext>();
                var sink = scope.ServiceProvider.GetRequiredService<IAuditOutboxDestinationClient>();

                var now = DateTime.UtcNow;
                var item = await db.AuditOutbox
                    .Include(x => x.AuditEvent)
                    .Where(x => (x.DeliveryState == "pending" || x.DeliveryState == "retry_wait")
                                && x.NextAttemptAtUtc <= now
                                && (x.LeaseExpiresAtUtc == null || x.LeaseExpiresAtUtc < now))
                    .OrderBy(x => x.NextAttemptAtUtc)
                    .FirstOrDefaultAsync(stoppingToken);

                var backlog = await db.AuditOutbox.LongCountAsync(x => x.DeliveryState == "pending" || x.DeliveryState == "retry_wait" || x.DeliveryState == "in_progress", stoppingToken);
                metrics.SetBacklogDepth(backlog);
                metrics.SetDeadLetterOpenCount(await db.AuditDeadLetters.LongCountAsync(x => x.OperatorStatus == "open", stoppingToken));

                if (item is null)
                {
                    await Task.Delay(TimeSpan.FromSeconds(1), stoppingToken);
                    continue;
                }

                item.DeliveryState = "in_progress";
                item.LeaseOwner = workerId;
                item.LeaseExpiresAtUtc = now.AddSeconds(30);
                item.UpdatedAtUtc = now;
                await db.SaveChangesAsync(stoppingToken);

                var result = await sink.DeliverAsync(item.AuditEvent, item.Destination, item.IdempotencyKey, stoppingToken);
                item.LastAttemptAtUtc = now;
                item.AttemptCount += 1;

                if (result.Success)
                {
                    item.DeliveryState = "delivered";
                    item.DeliveredAtUtc = DateTime.UtcNow;
                    item.LeaseOwner = null;
                    item.LeaseExpiresAtUtc = null;
                }
                else if (!result.Retryable && item.AttemptCount >= 1 || item.AttemptCount >= MaxAttempts)
                {
                    item.DeliveryState = "dead_lettered";
                    item.LeaseOwner = null;
                    item.LeaseExpiresAtUtc = null;

                    db.AuditDeadLetters.Add(new AuditDeadLetterEntity
                    {
                        Id = Guid.NewGuid(),
                        OutboxId = item.Id,
                        AuditEventId = item.AuditEventId,
                        Destination = item.Destination,
                        FinalAttemptCount = item.AttemptCount,
                        FirstFailedAtUtc = item.LastAttemptAtUtc ?? now,
                        DeadLetteredAtUtc = DateTime.UtcNow,
                        ErrorSummary = result.ErrorCode ?? "delivery_failed",
                        ErrorDetails = string.IsNullOrWhiteSpace(result.ErrorMessage) ? null : $"{{\"message\":\"{result.ErrorMessage}\"}}",
                        OperatorStatus = "open",
                        UpdatedAtUtc = DateTime.UtcNow
                    });
                }
                else
                {
                    item.DeliveryState = "retry_wait";
                    item.LastErrorCode = result.ErrorCode;
                    item.LastErrorMessage = Truncate(result.ErrorMessage, 1024);
                    item.LeaseOwner = null;
                    item.LeaseExpiresAtUtc = null;
                    item.NextAttemptAtUtc = DateTime.UtcNow.AddSeconds(Math.Min(3600, Math.Pow(2, Math.Max(0, item.AttemptCount - 1)) * 5 + Jitter.Next(0, 4)));
                }

                item.UpdatedAtUtc = DateTime.UtcNow;
                await db.SaveChangesAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Audit outbox worker iteration failed.");
                await Task.Delay(TimeSpan.FromSeconds(2), stoppingToken);
            }
        }
    }

    private static string? Truncate(string? value, int maxBytes)
    {
        if (string.IsNullOrWhiteSpace(value)) return value;
        var bytes = System.Text.Encoding.UTF8.GetByteCount(value);
        if (bytes <= maxBytes) return value;
        var keep = value[..Math.Min(value.Length, maxBytes / 2)];
        return keep + $"<TRUNCATED bytes_original={bytes} bytes_kept={System.Text.Encoding.UTF8.GetByteCount(keep)}>";
    }
}

public interface IAuditDeadLetterReplayService
{
    Task ReplayAsync(Guid deadLetterId, string operatorId, CancellationToken cancellationToken);
}

public sealed class AuditDeadLetterReplayService(ToolNexusContentDbContext dbContext) : IAuditDeadLetterReplayService
{
    public async Task ReplayAsync(Guid deadLetterId, string operatorId, CancellationToken cancellationToken)
    {
        var deadLetter = await dbContext.AuditDeadLetters.SingleOrDefaultAsync(x => x.Id == deadLetterId, cancellationToken);
        if (deadLetter is null)
        {
            return;
        }

        deadLetter.OperatorStatus = "requeued";
        deadLetter.OperatorId = operatorId;
        deadLetter.UpdatedAtUtc = DateTime.UtcNow;

        var version = deadLetter.FinalAttemptCount + 1;
        dbContext.AuditOutbox.Add(new AuditOutboxEntity
        {
            Id = Guid.NewGuid(),
            AuditEventId = deadLetter.AuditEventId,
            Destination = deadLetter.Destination,
            IdempotencyKey = $"{deadLetter.Destination}:{deadLetter.AuditEventId}:v{version}",
            DeliveryState = "pending",
            NextAttemptAtUtc = DateTime.UtcNow,
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        });

        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
