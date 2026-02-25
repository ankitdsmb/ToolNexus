using ToolNexus.Application.Abstractions;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services.Pipeline;
using ToolNexus.Application.Services.Pipeline.Steps;
using ToolNexus.Application.Services.Policies;
using Xunit;

namespace ToolNexus.Application.Tests;

public sealed class UniversalExecutionHardeningTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("unknown-runtime")]
    [InlineData("dotnet")]
    [InlineData("csharp")]
    public void RuntimeLanguageParser_DefaultsToDotNet(string? input)
    {
        var language = ToolRuntimeLanguageParser.ParseOrDefault(input);
        Assert.Equal(ToolRuntimeLanguage.DotNet, language);
    }

    [Fact]
    public void UniversalExecutionRequestMapper_MapsLegacyContextAndCorrelation()
    {
        var mapper = new UniversalExecutionRequestMapper();
        var context = new ToolExecutionContext("json-formatter", "format", "{}", new Dictionary<string, string>
        {
            ["language"] = "dotnet",
            ["correlationId"] = " corr-123 "
        });

        var request = mapper.Map(context);

        Assert.Equal(ToolRuntimeLanguage.DotNet, request.Language);
        Assert.Equal("corr-123", request.CorrelationId);
        Assert.Equal("json-formatter", request.Context["toolId"]);
        Assert.Equal("format", request.Context["action"]);
    }

    [Fact]
    public async Task ApiToolExecutionStrategy_WhenAdapterMissing_ReturnsNormalizedIncidentLikeResult()
    {
        var strategy = new ApiToolExecutionStrategy([], new ToolExecutionResiliencePipelineProvider(), new ToolExecutionMetrics());
        var policy = new TestPolicy();
        var request = new UniversalExecutionRequest("missing-tool", "run", "input", ToolRuntimeLanguage.DotNet, new Dictionary<string, string>(), "corr-1");

        var result = await strategy.ExecuteAsync(request, policy, CancellationToken.None);

        Assert.False(result.Response.Success);
        Assert.True(result.Response.NotFound);
        Assert.Equal("missing", result.AdapterResolutionStatus);
        Assert.Equal("none", result.AdapterName);
        Assert.Contains("No execution adapter is registered", result.Response.Error);
    }

    [Fact]
    public async Task ApiToolExecutionStrategy_DefaultDotNetPath_RemainsExecutable()
    {
        var strategy = new ApiToolExecutionStrategy([new EchoExecutor()], new ToolExecutionResiliencePipelineProvider(), new ToolExecutionMetrics());
        var policy = new TestPolicy();

        var response = await strategy.ExecuteAsync("echo", "format", "hello", policy, CancellationToken.None);

        Assert.True(response.Success);
        Assert.Equal("hello", response.Output);
    }

    [Fact]
    public async Task ExecutionStep_StoresObservabilityTagsInContext()
    {
        var fakeStrategy = new FakeStrategy();
        var step = new ExecutionStep(fakeStrategy, new UniversalExecutionRequestMapper());
        var context = new ToolExecutionContext("echo", "format", "hello", new Dictionary<string, string>())
        {
            Policy = new TestPolicy()
        };

        var response = await step.InvokeAsync(
            context,
            (_, _) => Task.FromResult(context.Response ?? new ToolExecutionResponse(false, string.Empty, "missing")),
            CancellationToken.None);

        Assert.True(response.Success);
        Assert.Equal("dotnet", context.Items[ExecutionStep.RuntimeLanguageContextKey]);
        Assert.Equal("EchoExecutor", context.Items[ExecutionStep.AdapterNameContextKey]);
        Assert.Equal("resolved", context.Items[ExecutionStep.AdapterResolutionStatusContextKey]);
    }

    private sealed class EchoExecutor : IToolExecutor
    {
        public string Slug => "echo";
        public ToolRuntimeLanguage Language => ToolRuntimeLanguage.DotNet;
        public ToolMetadata Metadata { get; } = new("echo", "echo", "utility", "", ["echo"]);
        public IReadOnlyCollection<string> SupportedActions { get; } = ["format"];

        public Task<ToolResult> ExecuteAsync(ToolRequest request, CancellationToken cancellationToken = default)
            => Task.FromResult(ToolResult.Ok(request.Input));
    }

    private sealed class FakeStrategy : IApiToolExecutionStrategy
    {
        public Task<ToolExecutionResponse> ExecuteAsync(string toolId, string action, string input, IToolExecutionPolicy? policy, CancellationToken cancellationToken = default)
            => Task.FromResult(new ToolExecutionResponse(true, input));

        public Task<UniversalExecutionResult> ExecuteAsync(UniversalExecutionRequest request, IToolExecutionPolicy? policy, CancellationToken cancellationToken = default)
            => Task.FromResult(new UniversalExecutionResult(new ToolExecutionResponse(true, request.Input), ToolRuntimeLanguage.DotNet, "EchoExecutor", "resolved"));
    }

    private sealed class TestPolicy : IToolExecutionPolicy
    {
        public string Slug => "echo";
        public string ExecutionMode => "server";
        public bool IsExecutionEnabled => true;
        public int TimeoutSeconds => 30;
        public int MaxInputSize => 10_000;
        public int MaxRequestsPerMinute => 100;
        public int CacheTtlSeconds => 0;
        public ToolHttpMethodPolicy AllowedHttpMethods => ToolHttpMethodPolicy.GetOrPost;
        public bool AllowAnonymous => true;
        public int MaxConcurrency => 5;
        public int RetryCount => 0;
        public int CircuitBreakerFailureThreshold => 2;
    }
}
