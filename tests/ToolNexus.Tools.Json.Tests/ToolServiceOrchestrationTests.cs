using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Domain;
using Xunit;

namespace ToolNexus.Tools.Json.Tests;

public sealed class ToolServiceOrchestrationTests
{
    [Fact]
    public async Task ExecuteAsync_ReturnsValidationError_WhenRequestIsNull()
    {
        var service = CreateService();

        var result = await service.ExecuteAsync(null!);

        Assert.False(result.Success);
        Assert.Equal("Request is required.", result.Error);
    }

    [Fact]
    public async Task ExecuteAsync_ReturnsCachedResponse_WithoutCallingExecutor()
    {
        var cached = new ToolExecutionResponse(true, "from-cache");
        var cache = new FakeToolResponseCache(cached);
        var executionClient = new FakeToolExecutionClient();
        var service = new ToolService(executionClient, cache);

        var result = await service.ExecuteAsync(new ToolExecutionRequest("JSON", "FORMAT", "{\"x\":1}"));

        Assert.True(result.Success);
        Assert.Equal("from-cache", result.Output);
        Assert.Equal(0, executionClient.CallCount);
    }

    [Fact]
    public async Task ExecuteAsync_ExecutesAndCachesSuccessfulResponse()
    {
        var executionClient = new FakeToolExecutionClient(
            ToolExecutionClientResult.Executed(new ToolResult(true, "ok")));
        var cache = new FakeToolResponseCache();
        var service = new ToolService(executionClient, cache);

        var result = await service.ExecuteAsync(new ToolExecutionRequest(" JSON ", " FORMAT ", "{\"x\":1}"));

        Assert.True(result.Success);
        Assert.Equal("ok", result.Output);
        Assert.Equal(1, executionClient.CallCount);
        Assert.Equal(1, cache.SetCount);
        Assert.Equal("json", cache.LastSetSlug);
        Assert.Equal("format", cache.LastSetAction);
    }

    [Fact]
    public async Task ExecuteAsync_DoesNotCacheFailedResponse()
    {
        var executionClient = new FakeToolExecutionClient(
            ToolExecutionClientResult.Executed(new ToolResult(false, string.Empty, "bad input")));
        var cache = new FakeToolResponseCache();
        var service = new ToolService(executionClient, cache);

        var result = await service.ExecuteAsync(new ToolExecutionRequest("json", "validate", "{"));

        Assert.False(result.Success);
        Assert.Equal(0, cache.SetCount);
    }

    [Fact]
    public async Task ExecuteAsync_ReturnsNotFound_WhenExecutionClientDoesNotFindTool()
    {
        var executionClient = new FakeToolExecutionClient(ToolExecutionClientResult.ToolNotFound());
        var service = new ToolService(executionClient, new FakeToolResponseCache());

        var result = await service.ExecuteAsync(new ToolExecutionRequest("missing-tool", "format", "{}"));

        Assert.False(result.Success);
        Assert.True(result.NotFound);
        Assert.Contains("missing-tool", result.Error);
    }

    private static ToolService CreateService() => new(new FakeToolExecutionClient(), new FakeToolResponseCache());

    private sealed class FakeToolExecutionClient(ToolExecutionClientResult? nextResult = null) : IToolExecutionClient
    {
        public int CallCount { get; private set; }

        public Task<ToolExecutionClientResult> ExecuteAsync(string slug, ToolRequest request, CancellationToken cancellationToken = default)
        {
            CallCount++;
            return Task.FromResult(nextResult ?? ToolExecutionClientResult.Executed(new ToolResult(true, "default")));
        }
    }

    private sealed class FakeToolResponseCache(ToolExecutionResponse? cached = null) : IToolResponseCache
    {
        public int SetCount { get; private set; }
        public string LastSetSlug { get; private set; } = string.Empty;
        public string LastSetAction { get; private set; } = string.Empty;

        public Task<ToolExecutionResponse?> GetAsync(string slug, string action, string input, CancellationToken cancellationToken = default)
            => Task.FromResult(cached);

        public Task SetAsync(string slug, string action, string input, ToolExecutionResponse response, CancellationToken cancellationToken = default)
        {
            SetCount++;
            LastSetSlug = slug;
            LastSetAction = action;
            return Task.CompletedTask;
        }
    }
}
