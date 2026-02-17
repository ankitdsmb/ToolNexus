using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using ToolNexus.Application.Models;
using ToolNexus.Application.Options;
using ToolNexus.Application.Services;
using ToolNexus.Application.Services.Pipeline;
using ToolNexus.Domain;
using Xunit;

namespace ToolNexus.Application.Tests;

public sealed class ToolExecutionPipelineTests
{
    [Fact]
    public async Task ExecuteAsync_ReturnsValidationError_WhenToolIdMissing()
    {
        var pipeline = CreatePipeline();

        var response = await pipeline.ExecuteAsync("", "format", "{}");

        Assert.False(response.Success);
        Assert.Equal("Tool slug is required.", response.Error);
    }

    [Fact]
    public async Task ExecuteAsync_ReturnsCachedValue_AndSkipsStrategies()
    {
        var cache = new FakeToolResultCache();
        cache.SeedAny(new ToolResultCacheItem(true, "cached-output", null));
        var client = new TrackingClientStrategy();
        var api = new TrackingApiStrategy();
        var pipeline = CreatePipeline(cache, client, api);

        var response = await pipeline.ExecuteAsync("json-formatter", "format", "{\"a\":1}");

        Assert.True(response.Success);
        Assert.Equal("cached-output", response.Output);
        Assert.Equal(0, client.Calls);
        Assert.Equal(0, api.Calls);
    }

    [Fact]
    public async Task ExecuteAsync_UsesClientStrategy_BeforeApiStrategy()
    {
        var cache = new FakeToolResultCache();
        var client = new TrackingClientStrategy(new ToolExecutionResponse(true, "client-output"));
        var api = new TrackingApiStrategy(new ToolExecutionResponse(true, "api-output"));
        var pipeline = CreatePipeline(cache, client, api);

        var response = await pipeline.ExecuteAsync("json-formatter", "format", "{\"a\":1}");

        Assert.True(response.Success);
        Assert.Equal("client-output", response.Output);
        Assert.Equal(1, client.Calls);
        Assert.Equal(0, api.Calls);
    }

    [Fact]
    public async Task ExecuteAsync_FallsBackToApiStrategy_WhenClientCannotExecute()
    {
        var cache = new FakeToolResultCache();
        var client = new TrackingClientStrategy();
        var api = new TrackingApiStrategy(new ToolExecutionResponse(true, "api-output"));
        var pipeline = CreatePipeline(cache, client, api);

        var response = await pipeline.ExecuteAsync("json-formatter", "format", "{\"a\":1}");

        Assert.True(response.Success);
        Assert.Equal("api-output", response.Output);
        Assert.Equal(1, client.Calls);
        Assert.Equal(1, api.Calls);
    }

    private static IToolExecutionPipeline CreatePipeline(
        FakeToolResultCache? cache = null,
        TrackingClientStrategy? client = null,
        TrackingApiStrategy? api = null)
    {
        cache ??= new FakeToolResultCache();
        client ??= new TrackingClientStrategy();
        api ??= new TrackingApiStrategy(new ToolExecutionResponse(true, "api-default"));

        var options = Options.Create(new ToolResultCacheOptions { AbsoluteExpirationSeconds = 60, KeyPrefix = "tests", MaxEntries = 100 });

        IToolExecutionStep[] steps =
        [
            new ValidationExecutionStep(),
            new CachingExecutionStep(cache, options, NullLogger<CachingExecutionStep>.Instance),
            new ClientExecutionStep([client]),
            new ApiExecutionStep(api),
            new PostProcessingExecutionStep(NullLogger<PostProcessingExecutionStep>.Instance)
        ];

        return new ToolExecutionPipeline(steps);
    }

    private sealed class TrackingClientStrategy(ToolExecutionResponse? response = null) : IClientToolExecutionStrategy
    {
        public int Calls { get; private set; }

        public Task<ToolExecutionResponse?> TryExecuteAsync(string toolId, string action, string input, CancellationToken cancellationToken = default)
        {
            Calls++;
            return Task.FromResult(response);
        }
    }

    private sealed class TrackingApiStrategy(ToolExecutionResponse? response = null) : IApiToolExecutionStrategy
    {
        public int Calls { get; private set; }

        public Task<ToolExecutionResponse> ExecuteAsync(string toolId, string action, string input, CancellationToken cancellationToken = default)
        {
            Calls++;
            return Task.FromResult(response ?? new ToolExecutionResponse(false, string.Empty, "No API response configured."));
        }
    }

    private sealed class FakeToolResultCache : IToolResultCache
    {
        private ToolResultCacheItem? _value;

        public void SeedAny(ToolResultCacheItem value) => _value = value;

        public Task<ToolResultCacheItem?> GetAsync(string key, CancellationToken cancellationToken = default)
            => Task.FromResult(_value);

        public Task SetAsync(string key, ToolResultCacheItem value, TimeSpan ttl, CancellationToken cancellationToken = default)
        {
            _value = value;
            return Task.CompletedTask;
        }
    }
}
