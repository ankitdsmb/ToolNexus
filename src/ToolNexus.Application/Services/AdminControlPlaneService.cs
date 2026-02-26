using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public sealed class AdminControlPlaneService(
    IAdminControlPlaneRepository repository,
    IPlatformCacheService platformCache,
    AdminControlPlaneTelemetry telemetry) : IAdminControlPlaneService
{
    public async Task<AdminControlPlaneOperationResult> ResetCachesAsync(OperatorCommandRequest commandRequest, CancellationToken cancellationToken)
    {
        var correlationId = Guid.NewGuid().ToString("N");
        await platformCache.RemoveByPrefixAsync("platform:", cancellationToken);
        await platformCache.RemoveByPrefixAsync("tool:", cancellationToken);
        await repository.RecordOperationAsync("maintenance", "cache_reset", "success", new { commandRequest.Reason, commandRequest.ImpactScope, correlationId }, cancellationToken);
        await repository.RecordOperatorCommandAsync("cache_reset", commandRequest, "success", correlationId, commandRequest.RollbackPlan, cancellationToken);
        telemetry.Operations.Add(1,
            new("operation", "cache_reset"),
            new("event_name", "operator.command.executed"),
            new("impact_scope", commandRequest.ImpactScope),
            new("authority_context", commandRequest.AuthorityContext),
            new("correlation_id", correlationId));
        return new AdminControlPlaneOperationResult("cache_reset", "success", "Runtime and UI caches were reset.", 0, correlationId, commandRequest.ImpactScope, commandRequest.AuthorityContext, commandRequest.RollbackPlan);
    }

    public async Task<AdminControlPlaneOperationResult> DrainAuditQueueAsync(OperatorCommandRequest commandRequest, CancellationToken cancellationToken)
    {
        var correlationId = Guid.NewGuid().ToString("N");
        var affected = await repository.DrainAuditQueueAsync(cancellationToken);
        await repository.RecordOperationAsync("runtime", "queue_drain", "success", new { affected, commandRequest.Reason, commandRequest.ImpactScope, correlationId }, cancellationToken);
        await repository.RecordOperatorCommandAsync("queue_drain", commandRequest, "success", correlationId, commandRequest.RollbackPlan, cancellationToken);
        telemetry.Operations.Add(1,
            new("operation", "queue_drain"),
            new("event_name", "operator.command.executed"),
            new("impact_scope", commandRequest.ImpactScope),
            new("authority_context", commandRequest.AuthorityContext),
            new("correlation_id", correlationId));
        return new AdminControlPlaneOperationResult("queue_drain", "success", "Pending queue items were marked for immediate retry.", affected, correlationId, commandRequest.ImpactScope, commandRequest.AuthorityContext, commandRequest.RollbackPlan);
    }

    public async Task<AdminControlPlaneOperationResult> ReplayAuditDeadLettersAsync(OperatorCommandRequest commandRequest, CancellationToken cancellationToken)
    {
        var correlationId = Guid.NewGuid().ToString("N");
        var affected = await repository.ReplayAuditDeadLettersAsync(cancellationToken);
        await repository.RecordOperationAsync("runtime", "queue_replay", "success", new { affected, commandRequest.Reason, commandRequest.ImpactScope, correlationId }, cancellationToken);
        await repository.RecordOperatorCommandAsync("queue_replay", commandRequest, "success", correlationId, commandRequest.RollbackPlan, cancellationToken);
        telemetry.Operations.Add(1,
            new("operation", "queue_replay"),
            new("event_name", "operator.command.executed"),
            new("impact_scope", commandRequest.ImpactScope),
            new("authority_context", commandRequest.AuthorityContext),
            new("correlation_id", correlationId));
        return new AdminControlPlaneOperationResult("queue_replay", "success", "Open dead letters were replayed into outbox.", affected, correlationId, commandRequest.ImpactScope, commandRequest.AuthorityContext, commandRequest.RollbackPlan);
    }
}
