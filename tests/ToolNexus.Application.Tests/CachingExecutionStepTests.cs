using System.Collections.Concurrent;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using ToolNexus.Application.Models;
using ToolNexus.Application.Options;
using ToolNexus.Application.Services;
using ToolNexus.Application.Services.Pipeline;

namespace ToolNexus.Application.Tests;

public sealed class CachingExecutionStepTests
{
    [Fact]
    public void CacheKeyBuilder_Build_WithDifferentOptions_ReturnsDifferentKeys()
    {
        var keyA = CacheKeyBuilder.Build(
            "json",
            "format",
            "{\"name\":\"toolnexus\"}",
            new Dictionary<string, string>(StringComparer.Ordinal)
            {
                ["indent"] = "2",
                ["sort"] = "true"
            });

        var keyB = CacheKeyBuilder.Build(
            "json",
            "format",
            "{\"name\":\"toolnexus\"}",
            new Dictionary<string, string>(StringComparer.Ordinal)
            {
                ["indent"] = "4",
                ["sort"] = "true"
            });

        Assert.NotEqual(keyA, keyB);
    }

    [Fact]
    public async Task InvokeAsync_OnConcurrentMisses_UsesSingleFlightAndCallsBackendOnce()
    {
        var cache = new FakeToolResultCache();
        var step = new CachingExecutionStep(
            cache,
            Options.Create(new ToolResultCacheOptions { AbsoluteExpirationSeconds = 300 }),
            NullLogger<CachingExecutionStep>.Instance);

        var backendCalls = 0;
        Task<ToolExecutionResponse> Backend(ToolExecutionContext _, CancellationToken cancellationToken)
        {
            Interlocked.Increment(ref backendCalls);
            return Task.FromResult(new ToolExecutionResponse(true, "payload"));
        }

        var contexts = Enumerable.Range(0, 20)
            .Select(_ => new ToolExecutionContext(
                "json",
                "format",
                "{\"hello\":\"world\"}",
                new Dictionary<string, string> { ["indent"] = "2" })
            {
                Manifest = new ToolManifest
                {
                    Slug = "json",
                    Version = "1.0.0",
                    Description = "JSON formatter",
                    Category = "formatting",
                    SupportedActions = ["format"],
                    IsCacheable = true
                }
            })
            .ToArray();

        var responses = await Task.WhenAll(contexts.Select(context => step.InvokeAsync(context, Backend, CancellationToken.None)));

        Assert.Equal(1, backendCalls);
        Assert.All(responses, response => Assert.Equal("payload", response.Output));
    }

    private sealed class FakeToolResultCache : IToolResultCache
    {
        private readonly ConcurrentDictionary<string, ToolResultCacheItem> _items = new(StringComparer.Ordinal);

        public Task<ToolResultCacheItem?> GetAsync(string key, CancellationToken cancellationToken)
        {
            _items.TryGetValue(key, out var value);
            return Task.FromResult<ToolResultCacheItem?>(value);
        }

        public Task SetAsync(string key, ToolResultCacheItem item, TimeSpan expiration, CancellationToken cancellationToken)
        {
            _items[key] = item;
            return Task.CompletedTask;
        }
    }
}
