using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Hosting;
using System.Collections.Concurrent;
using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using ToolNexus.Application.Services;
using ToolNexus.Domain;

namespace ToolNexus.Api.IntegrationTests;

public sealed class ToolsEndpointIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public ToolsEndpointIntegrationTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.WithWebHostBuilder(_ => { }).CreateClient();
    }

    [Fact, Trait("Category", "Integration")]
    public async Task Get_ToolEndpoint_ReturnsSuccess_ForValidSlugAndAction()
    {
        var response = await _client.GetAsync("/api/tools/json-formatter/format?input=%7B%22name%22%3A%22Ada%22%7D");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact, Trait("Category", "Integration")]
    public async Task Get_ToolEndpoint_ReturnsNotFound_ForUnknownSlug()
    {
        var response = await _client.GetAsync("/api/tools/not-real/format?input=%7B%22name%22%3A%22Ada%22%7D");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact, Trait("Category", "RateLimit"), Trait("Category", "Integration")]
    public async Task RateLimit_ExceedingLimit_Returns429ProblemDetails()
    {
        using var factory = new RateLimitFactory();
        using var client = factory.CreateClient();

        var first = await client.GetAsync("/api/tools/json-formatter/format?input=%7B%22name%22%3A1%7D");
        var second = await client.GetAsync("/api/tools/json-formatter/format?input=%7B%22name%22%3A2%7D");

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Equal((HttpStatusCode)429, second.StatusCode);

        var payload = await second.Content.ReadFromJsonAsync<ProblemDetailsResponse>();
        Assert.NotNull(payload);
        Assert.Equal(429, payload!.Status);
        Assert.Equal("Too many requests.", payload.Title);
    }

    [Fact, Trait("Category", "RateLimit"), Trait("Category", "Integration")]
    public async Task RateLimit_ResetsAfterWindow()
    {
        using var factory = new RateLimitFactory();
        using var client = factory.CreateClient();

        var first = await client.GetAsync("/api/tools/json-formatter/format?input=%7B%22name%22%3A1%7D");
        var limited = await client.GetAsync("/api/tools/json-formatter/format?input=%7B%22name%22%3A2%7D");

        await Task.Delay(TimeSpan.FromMilliseconds(1300));

        var afterReset = await client.GetAsync("/api/tools/json-formatter/format?input=%7B%22name%22%3A3%7D");

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Equal((HttpStatusCode)429, limited.StatusCode);
        Assert.Equal(HttpStatusCode.OK, afterReset.StatusCode);
    }

    [Fact, Trait("Category", "Caching"), Trait("Category", "Integration")]
    public async Task Caching_Hit_DoesNotReExecuteTool_AndMissAfterExpiryReexecutes()
    {
        using var factory = new CachingFactory();
        using var client = factory.CreateClient();
        var slug = CountingToolExecutor.SlugValue;

        var first = await client.PostAsJsonAsync($"/api/v1/tools/{slug}", new { action = "run", input = "same-input" });
        var second = await client.PostAsJsonAsync($"/api/v1/tools/{slug}", new { action = "run", input = "same-input" });

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Equal(HttpStatusCode.OK, second.StatusCode);
        Assert.Equal(1, factory.Executor.InvocationCount);
        Assert.Contains(factory.Cache.Keys, x => x.StartsWith($"{slug}:run:", StringComparison.Ordinal));

        await Task.Delay(TimeSpan.FromMilliseconds(1200));

        var third = await client.PostAsJsonAsync($"/api/v1/tools/{slug}", new { action = "run", input = "same-input" });
        Assert.Equal(HttpStatusCode.OK, third.StatusCode);
        Assert.Equal(2, factory.Executor.InvocationCount);
    }

    private sealed record ProblemDetailsResponse(int Status, string Title);

    private sealed class RateLimitFactory : WebApplicationFactory<Program>
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.ConfigureAppConfiguration((_, config) =>
            {
                config.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["RateLimiting:IpPerMinute"] = "1",
                    ["RateLimiting:IpWindowSeconds"] = "1"
                });
            });
        }
    }

    private sealed class CachingFactory : WebApplicationFactory<Program>
    {
        public CountingToolExecutor Executor { get; } = new();
        public InMemoryToolResultCache Cache { get; } = new();

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.ConfigureAppConfiguration((_, config) =>
            {
                config.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["ToolResultCache:AbsoluteExpirationSeconds"] = "1"
                });
            });

            builder.ConfigureTestServices(services =>
            {
                services.RemoveAll<IToolExecutor>();
                services.RemoveAll<IToolResultCache>();
                services.AddSingleton<IToolExecutor>(Executor);
                services.AddSingleton<IToolResultCache>(Cache);
            });
        }
    }

    private sealed class CountingToolExecutor : IToolExecutor
    {
        public const string SlugValue = "counting-tool";
        private int _invocationCount;
        public int InvocationCount => _invocationCount;
        public string Slug => SlugValue;
        public ToolMetadata Metadata => new("Counting", "desc", "cat", "sample", ["test"]);
        public IReadOnlyCollection<string> SupportedActions => ["run"];

        public Task<ToolResult> ExecuteAsync(ToolRequest request, CancellationToken cancellationToken = default)
        {
            Interlocked.Increment(ref _invocationCount);
            return Task.FromResult(ToolResult.Ok($"result-{request.Input}"));
        }
    }

    private sealed class InMemoryToolResultCache : IToolResultCache
    {
        private readonly ConcurrentDictionary<string, (ToolResultCacheItem Value, DateTimeOffset Expires)> _store = new();
        public IReadOnlyCollection<string> Keys => _store.Keys.ToArray();

        public Task<ToolResultCacheItem?> GetAsync(string key, CancellationToken cancellationToken = default)
        {
            if (!_store.TryGetValue(key, out var entry))
            {
                return Task.FromResult<ToolResultCacheItem?>(null);
            }

            if (entry.Expires <= DateTimeOffset.UtcNow)
            {
                _store.TryRemove(key, out _);
                return Task.FromResult<ToolResultCacheItem?>(null);
            }

            return Task.FromResult<ToolResultCacheItem?>(entry.Value);
        }

        public Task SetAsync(string key, ToolResultCacheItem value, TimeSpan ttl, CancellationToken cancellationToken = default)
        {
            _store[key] = (value, DateTimeOffset.UtcNow.Add(ttl));
            return Task.CompletedTask;
        }
    }
}
