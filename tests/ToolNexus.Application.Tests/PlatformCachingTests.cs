using Microsoft.Extensions.Options;
using ToolNexus.Application.Models;
using ToolNexus.Application.Options;
using ToolNexus.Application.Services;
using Xunit;

namespace ToolNexus.Application.Tests;

public sealed class PlatformCachingTests
{
    private static readonly IOptions<PlatformCacheOptions> CacheOptions = Microsoft.Extensions.Options.Options.Create(new PlatformCacheOptions
    {
        ToolMetadataTtlSeconds = 300,
        ExecutionPoliciesTtlSeconds = 300,
        AnalyticsDashboardTtlSeconds = 300,
        DailyMetricsSnapshotsTtlSeconds = 300
    });

    [Fact]
    public async Task CacheHit_ReturnsCachedData_ForToolMetadata()
    {
        var cache = new InMemoryTestPlatformCache();
        var repository = new ToolDefinitionRepoStub();
        var service = new CachingToolDefinitionService(new ToolDefinitionService(repository), cache, CacheOptions);

        var first = await service.GetListAsync();
        var second = await service.GetListAsync();

        Assert.Single(first);
        Assert.Same(first, second);
        Assert.Equal(1, repository.GetListCallCount);
    }

    [Fact]
    public async Task AdminUpdate_InvalidatesCachedExecutionPolicy()
    {
        var cache = new InMemoryTestPlatformCache();
        var repository = new ExecutionPolicyRepoStub();
        var service = new CachingExecutionPolicyService(new ExecutionPolicyService(repository), cache, CacheOptions);

        var initial = await service.GetBySlugAsync("json-formatter");
        Assert.Equal(1, repository.GetBySlugCallCount);

        var updated = await service.UpdateBySlugAsync("json-formatter", new UpdateToolExecutionPolicyRequest("Remote", 20, 200, 9999, true));
        var reloaded = await service.GetBySlugAsync("json-formatter");

        Assert.Equal("Remote", updated.ExecutionMode);
        Assert.Equal("Remote", reloaded.ExecutionMode);
        Assert.Equal(2, repository.GetBySlugCallCount);
    }

    [Fact]
    public async Task CacheMiss_ThenReloads_ForDashboardSummary()
    {
        var cache = new InMemoryTestPlatformCache();
        var repository = new AnalyticsRepoStub();
        var inner = new AdminAnalyticsService(repository);
        var service = new CachingAdminAnalyticsService(inner, cache, CacheOptions);

        await service.GetDashboardAsync(CancellationToken.None);
        cache.Remove("platform:analytics:dashboard");
        await service.GetDashboardAsync(CancellationToken.None);

        Assert.Equal(2, repository.GetByDateRangeCallCount);
    }

    private sealed class InMemoryTestPlatformCache : IPlatformCacheService
    {
        private readonly Dictionary<string, object?> _entries = new(StringComparer.Ordinal);

        public async Task<T> GetOrCreateAsync<T>(string key, Func<CancellationToken, Task<T>> factory, TimeSpan ttl, CancellationToken cancellationToken = default)
        {
            if (_entries.TryGetValue(key, out var existing) && existing is T cached)
            {
                return cached;
            }

            var created = await factory(cancellationToken);
            _entries[key] = created;
            return created;
        }

        public void Remove(string key) => _entries.Remove(key);

        public void RemoveByPrefix(string prefix)
        {
            var keys = _entries.Keys.Where(x => x.StartsWith(prefix, StringComparison.Ordinal)).ToList();
            foreach (var key in keys)
            {
                _entries.Remove(key);
            }
        }
    }

    private sealed class ToolDefinitionRepoStub : IToolDefinitionRepository
    {
        public int GetListCallCount { get; private set; }

        public Task<IReadOnlyCollection<ToolDefinitionListItem>> GetListAsync(CancellationToken cancellationToken = default)
        {
            GetListCallCount++;
            return Task.FromResult<IReadOnlyCollection<ToolDefinitionListItem>>([
                new ToolDefinitionListItem(1, "JSON Formatter", "json-formatter", "Data", "Enabled", DateTimeOffset.UtcNow)
            ]);
        }

        public Task<ToolDefinitionDetail?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
            => Task.FromResult<ToolDefinitionDetail?>(null);

        public Task<bool> ExistsBySlugAsync(string slug, int? excludingId = null, CancellationToken cancellationToken = default)
            => Task.FromResult(false);

        public Task<ToolDefinitionDetail> CreateAsync(CreateToolDefinitionRequest request, CancellationToken cancellationToken = default)
            => throw new NotImplementedException();

        public Task<ToolDefinitionDetail?> UpdateAsync(int id, UpdateToolDefinitionRequest request, CancellationToken cancellationToken = default)
            => throw new NotImplementedException();

        public Task<bool> SetEnabledAsync(int id, bool enabled, CancellationToken cancellationToken = default)
            => throw new NotImplementedException();
    }

    private sealed class ExecutionPolicyRepoStub : IExecutionPolicyRepository
    {
        private ToolExecutionPolicyModel _model = new(2, "json-formatter", "Local", 15, 120, 1000, true);
        public int GetBySlugCallCount { get; private set; }

        public Task<ToolExecutionPolicyModel?> GetBySlugAsync(string slug, CancellationToken cancellationToken = default)
        {
            GetBySlugCallCount++;
            return Task.FromResult<ToolExecutionPolicyModel?>(_model);
        }

        public Task<ToolExecutionPolicyModel?> GetByToolIdAsync(int toolId, CancellationToken cancellationToken = default)
            => Task.FromResult<ToolExecutionPolicyModel?>(_model.ToolId == toolId ? _model : null);

        public Task<ToolExecutionPolicyModel?> UpsertBySlugAsync(string slug, UpdateToolExecutionPolicyRequest request, CancellationToken cancellationToken = default)
        {
            _model = _model with
            {
                ExecutionMode = request.ExecutionMode,
                TimeoutSeconds = request.TimeoutSeconds,
                MaxRequestsPerMinute = request.MaxRequestsPerMinute,
                MaxInputSize = request.MaxInputSize,
                IsExecutionEnabled = request.IsExecutionEnabled
            };

            return Task.FromResult<ToolExecutionPolicyModel?>(_model);
        }
    }

    private sealed class AnalyticsRepoStub : IAdminAnalyticsRepository
    {
        public int GetByDateRangeCallCount { get; private set; }

        public Task<IReadOnlyList<DailyToolMetricsSnapshot>> GetByDateRangeAsync(DateOnly startDateInclusive, DateOnly endDateInclusive, CancellationToken cancellationToken)
        {
            GetByDateRangeCallCount++;
            var today = DateOnly.FromDateTime(DateTime.UtcNow.Date);
            return Task.FromResult<IReadOnlyList<DailyToolMetricsSnapshot>>([
                new DailyToolMetricsSnapshot("json", today, 10, 9, 12)
            ]);
        }

        public Task ReplaceAnomaliesForDateAsync(DateOnly date, IReadOnlyList<ToolAnomalySnapshot> anomalies, CancellationToken cancellationToken)
            => Task.CompletedTask;

        public Task<IReadOnlyList<ToolAnomalySnapshot>> GetAnomaliesByDateAsync(DateOnly date, CancellationToken cancellationToken)
            => Task.FromResult<IReadOnlyList<ToolAnomalySnapshot>>([]);
    }

}
