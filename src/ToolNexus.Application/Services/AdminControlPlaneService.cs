using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public sealed class AdminControlPlaneService(
    IAdminControlPlaneRepository repository,
    IPlatformCacheService platformCache,
    AdminControlPlaneTelemetry telemetry) : IAdminControlPlaneService
{
    public async Task<AdminControlPlaneOperationResult> ResetCachesAsync(CancellationToken cancellationToken)
    {
        await platformCache.RemoveByPrefixAsync("platform:", cancellationToken);
        await platformCache.RemoveByPrefixAsync("tool:", cancellationToken);
        await repository.RecordOperationAsync("maintenance", "cache_reset", "success", new { scope = "runtime+ui" }, cancellationToken);
        telemetry.Operations.Add(1, new KeyValuePair<string, object?>("operation", "cache_reset"));
        return new AdminControlPlaneOperationResult("cache_reset", "success", "Runtime and UI caches were reset.", 0);
    }

    public async Task<AdminControlPlaneOperationResult> DrainAuditQueueAsync(CancellationToken cancellationToken)
    {
        var affected = await repository.DrainAuditQueueAsync(cancellationToken);
        await repository.RecordOperationAsync("runtime", "queue_drain", "success", new { affected }, cancellationToken);
        telemetry.Operations.Add(1, new KeyValuePair<string, object?>("operation", "queue_drain"));
        return new AdminControlPlaneOperationResult("queue_drain", "success", "Pending queue items were marked for immediate retry.", affected);
    }

    public async Task<AdminControlPlaneOperationResult> ReplayAuditDeadLettersAsync(CancellationToken cancellationToken)
    {
        var affected = await repository.ReplayAuditDeadLettersAsync(cancellationToken);
        await repository.RecordOperationAsync("runtime", "queue_replay", "success", new { affected }, cancellationToken);
        telemetry.Operations.Add(1, new KeyValuePair<string, object?>("operation", "queue_replay"));
        return new AdminControlPlaneOperationResult("queue_replay", "success", "Open dead letters were replayed into outbox.", affected);
    }
}
