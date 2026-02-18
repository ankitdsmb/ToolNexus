using Microsoft.Extensions.Logging.Abstractions;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Application.Services.Insights;
using ToolNexus.Application.Services.Pipeline;
using Xunit;

namespace ToolNexus.Application.Tests;

public sealed class ToolInsightServiceTests
{
    [Fact]
    public void GetInsight_KnownSlug_ReturnsProviderInsight()
    {
        var provider = new StubInsightProvider("json-formatter", new ToolInsightResult("t", "e", "s"));
        var service = new ToolInsightService([provider]);

        var result = service.GetInsight("JSON-FORMATTER", "format", "{}", null, null);

        Assert.NotNull(result);
        Assert.Equal("t", result!.Title);
    }

    [Fact]
    public void GetInsight_UnknownSlug_ReturnsNull()
    {
        var service = new ToolInsightService([new StubInsightProvider("json-formatter", new ToolInsightResult("t", "e", "s"))]);

        var result = service.GetInsight("missing", "format", "{}", null, null);

        Assert.Null(result);
    }

    [Fact]
    public async Task ToolService_AttachesInsight_WhenExecutionSucceeds()
    {
        var pipeline = new StubPipeline(new ToolExecutionResponse(true, "ok"));
        var insightService = new ToolInsightService([new StubInsightProvider("json-formatter", new ToolInsightResult("title", "explanation", "suggestion"))]);
        var service = new ToolService(pipeline, insightService, NullLogger<ToolService>.Instance);

        var response = await service.ExecuteAsync(new ToolExecutionRequest("json-formatter", "format", "{}", null));

        Assert.True(response.Success);
        Assert.NotNull(response.Insight);
        Assert.Equal("title", response.Insight!.Title);
    }

    [Fact]
    public async Task ToolService_InsightFailure_DoesNotBreakExecution()
    {
        var pipeline = new StubPipeline(new ToolExecutionResponse(true, "ok"));
        var service = new ToolService(pipeline, new ThrowingInsightService(), NullLogger<ToolService>.Instance);

        var response = await service.ExecuteAsync(new ToolExecutionRequest("json-formatter", "format", "{}", null));

        Assert.True(response.Success);
        Assert.Equal("ok", response.Output);
        Assert.Null(response.Insight);
    }

    [Fact]
    public async Task ToolService_NullRequest_ReturnsValidationError()
    {
        var pipeline = new StubPipeline(new ToolExecutionResponse(true, "ok"));
        var service = new ToolService(pipeline, new ToolInsightService([]), NullLogger<ToolService>.Instance);

        var response = await service.ExecuteAsync(null!);

        Assert.False(response.Success);
        Assert.Equal("Request is required.", response.Error);
    }

    private sealed class StubPipeline(ToolExecutionResponse response) : IToolExecutionPipeline
    {
        public Task<ToolExecutionResponse> ExecuteAsync(string toolId, string action, string input, IDictionary<string, string>? options = null, CancellationToken cancellationToken = default)
            => Task.FromResult(response);
    }

    private sealed class StubInsightProvider(string slug, ToolInsightResult? result) : IToolInsightProvider
    {
        public string ToolSlug => slug;

        public ToolInsightResult? GenerateInsight(string action, string input, string? error, IDictionary<string, string>? options)
            => result;
    }

    private sealed class ThrowingInsightService : IToolInsightService
    {
        public ToolInsightResult? GetInsight(string slug, string action, string input, string? error, IDictionary<string, string>? options)
            => throw new InvalidOperationException("boom");
    }
}
