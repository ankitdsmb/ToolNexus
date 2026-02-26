using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Infrastructure.Content.Entities;
using ToolNexus.Infrastructure.Data;

namespace ToolNexus.Infrastructure.Content;

public sealed class EfAdminControlPlaneRepository(
    ToolNexusContentDbContext dbContext,
    IHttpContextAccessor httpContextAccessor,
    IAdminAuditLogger auditLogger) : IAdminControlPlaneRepository
{
    public async Task<int> DrainAuditQueueAsync(CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var affected = await dbContext.AuditOutbox
            .Where(x => x.DeliveryState == "pending" || x.DeliveryState == "retry_wait")
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(x => x.DeliveryState, "pending")
                .SetProperty(x => x.NextAttemptAtUtc, now)
                .SetProperty(x => x.UpdatedAtUtc, now), cancellationToken);

        await auditLogger.TryLogAsync("queue_drain", "admin.controlplane", "audit_outbox", null, new { affected }, cancellationToken);
        return affected;
    }

    public async Task<int> ReplayAuditDeadLettersAsync(CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var openEntries = await dbContext.AuditDeadLetters
            .Where(x => x.OperatorStatus == "open")
            .ToListAsync(cancellationToken);

        foreach (var entry in openEntries)
        {
            entry.OperatorStatus = "replayed";
            entry.OperatorNote = "Replay requested from admin control plane.";
            entry.OperatorId = ResolveActorId();
            entry.UpdatedAtUtc = now;
        }

        var outboxIds = openEntries.Select(x => x.OutboxId).ToHashSet();
        var replayed = await dbContext.AuditOutbox
            .Where(x => outboxIds.Contains(x.Id))
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(x => x.DeliveryState, "pending")
                .SetProperty(x => x.NextAttemptAtUtc, now)
                .SetProperty(x => x.UpdatedAtUtc, now), cancellationToken);

        await dbContext.SaveChangesAsync(cancellationToken);
        await auditLogger.TryLogAsync("queue_replay", "admin.controlplane", "audit_dead_letter", null, new { affected = replayed }, cancellationToken);
        return replayed;
    }

    public async Task RecordOperationAsync(string operationDomain, string operationName, string resultStatus, object payload, CancellationToken cancellationToken)
    {
        var item = new AdminOperationLedgerEntity
        {
            Id = Guid.NewGuid(),
            OperationDomain = operationDomain,
            OperationName = operationName,
            ResultStatus = resultStatus,
            RequestedBy = ResolveActorId(),
            CorrelationId = httpContextAccessor.HttpContext?.TraceIdentifier,
            PayloadJson = JsonSerializer.Serialize(payload),
            ExecutedAtUtc = DateTime.UtcNow
        };

        dbContext.Add(item);
        await dbContext.SaveChangesAsync(cancellationToken);
    }


    public async Task RecordOperatorCommandAsync(string commandType, OperatorCommandRequest request, string resultStatus, string correlationId, string? rollbackInfo, CancellationToken cancellationToken)
    {
        var entity = new OperatorCommandEntity
        {
            Id = Guid.NewGuid(),
            Command = commandType,
            ExecutedBy = ResolveActorId(),
            Reason = request.Reason,
            TimestampUtc = DateTime.UtcNow,
            Result = resultStatus,
            RollbackInfo = rollbackInfo,
            ImpactScope = request.ImpactScope,
            CorrelationId = correlationId,
            AuthorityContext = request.AuthorityContext
        };

        dbContext.Add(entity);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private string ResolveActorId()
    {
        var user = httpContextAccessor.HttpContext?.User;
        return user?.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? user?.FindFirstValue("sub")
            ?? user?.Identity?.Name
            ?? "system";
    }
}

