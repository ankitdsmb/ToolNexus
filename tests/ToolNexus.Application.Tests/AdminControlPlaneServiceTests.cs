using ToolNexus.Application.Services;
using Xunit;

namespace ToolNexus.Application.Tests;

public sealed class AdminControlPlaneServiceTests
{
    [Fact]
    public async Task DrainQueue_RecordsOperation()
    {
        var repo = new StubRepository();
        var cache = new StubCache();
        var svc = new AdminControlPlaneService(repo, cache, new AdminControlPlaneTelemetry());

        var result = await svc.DrainAuditQueueAsync(CancellationToken.None);

        Assert.Equal("queue_drain", result.OperationName);
        Assert.Equal(1, repo.RecordCalls);
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

        public Task<int> DrainAuditQueueAsync(CancellationToken cancellationToken) => Task.FromResult(2);
        public Task<int> ReplayAuditDeadLettersAsync(CancellationToken cancellationToken) => Task.FromResult(1);

        public Task RecordOperationAsync(string operationDomain, string operationName, string resultStatus, object payload, CancellationToken cancellationToken)
        {
            RecordCalls++;
            return Task.CompletedTask;
        }
    }
}
