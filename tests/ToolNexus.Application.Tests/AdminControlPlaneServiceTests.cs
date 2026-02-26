using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using Xunit;

namespace ToolNexus.Application.Tests;

public sealed class AdminControlPlaneServiceTests
{
    [Fact]
    public async Task DrainQueue_RecordsOperationAndOperatorCommand()
    {
        var repo = new StubRepository();
        var cache = new StubCache();
        var svc = new AdminControlPlaneService(repo, cache, new AdminControlPlaneTelemetry());

        var result = await svc.DrainAuditQueueAsync(new OperatorCommandRequest("incident", "runtime", "operator", null, "replay dead letters"), CancellationToken.None);

        Assert.Equal("queue_drain", result.OperationName);
        Assert.Equal(1, repo.RecordCalls);
        Assert.Equal(1, repo.OperatorCommandCalls);
        Assert.False(string.IsNullOrWhiteSpace(result.CorrelationId));
    }

    private sealed class StubCache : IPlatformCacheService
    {
        public Task<T> GetOrCreateAsync<T>(string key, Func<CancellationToken, Task<T>> factory, TimeSpan ttl, CancellationToken cancellationToken = default)
            => factory(cancellationToken);

        public void Remove(string key) { }
        public Task RemoveAsync(string key, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public void RemoveByPrefix(string prefix) { }
        public Task RemoveByPrefixAsync(string prefix, CancellationToken cancellationToken = default) => Task.CompletedTask;
    }

    private sealed class StubRepository : IAdminControlPlaneRepository
    {
        public int RecordCalls { get; private set; }
        public int OperatorCommandCalls { get; private set; }

        public Task<int> DrainAuditQueueAsync(CancellationToken cancellationToken) => Task.FromResult(2);
        public Task<int> ReplayAuditDeadLettersAsync(CancellationToken cancellationToken) => Task.FromResult(1);

        public Task RecordOperationAsync(string operationDomain, string operationName, string resultStatus, object payload, CancellationToken cancellationToken)
        {
            RecordCalls++;
            return Task.CompletedTask;
        }

        public Task RecordOperatorCommandAsync(string commandType, OperatorCommandRequest request, string resultStatus, string correlationId, string? rollbackInfo, CancellationToken cancellationToken)
        {
            OperatorCommandCalls++;
            return Task.CompletedTask;
        }
    }
}
