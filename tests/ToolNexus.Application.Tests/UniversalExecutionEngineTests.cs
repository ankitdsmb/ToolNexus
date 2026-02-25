using ToolNexus.Application.Models;
using ToolNexus.Application.Services.Pipeline;
using ToolNexus.Application.Services.Policies;

namespace ToolNexus.Application.Tests;

public sealed class UniversalExecutionEngineTests
{
    [Fact]
    public async Task ExecuteAsync_UsesRegisteredAdapterByLanguage()
    {
        var adapter = new StubAdapter(ToolRuntimeLanguage.DotNet, new UniversalToolExecutionResult(
            true,
            "ok",
            null,
            false,
            "json",
            "1.0.0",
            "dotnet",
            "format",
            null,
            null,
            5,
            null,
            null));
        var engine = new UniversalExecutionEngine([adapter]);

        var context = new ToolExecutionContext("json", "format", "{}", null)
        {
            Policy = new StubPolicy()
        };

        var result = await engine.ExecuteAsync(
            new UniversalToolExecutionRequest("json", "1.0.0", ToolRuntimeLanguage.DotNet, "format", "{}", null, null, 1000, null, null),
            context,
            CancellationToken.None);

        Assert.True(result.Success);
        Assert.Equal("ok", result.Output);
        Assert.Equal(1, adapter.Calls);
        Assert.Equal("resolved", context.Items[UniversalExecutionEngine.AdapterResolutionStatusContextKey]);
    }

    [Fact]
    public async Task ExecuteAsync_ReturnsNormalizedFailureWhenAdapterIsMissing()
    {
        var engine = new UniversalExecutionEngine([]);
        var context = new ToolExecutionContext("json", "format", "{}", null)
        {
            Policy = new StubPolicy()
        };

        var result = await engine.ExecuteAsync(
            new UniversalToolExecutionRequest("json", "1.0.0", ToolRuntimeLanguage.DotNet, "format", "{}", null, null, 1000, null, null),
            context,
            CancellationToken.None);

        Assert.False(result.Success);
        Assert.Contains("No execution adapter registered", result.Error, StringComparison.Ordinal);
        Assert.Equal("missing", context.Items[UniversalExecutionEngine.AdapterResolutionStatusContextKey]);
    }

    private sealed class StubAdapter(ToolRuntimeLanguage language, UniversalToolExecutionResult result) : ILanguageExecutionAdapter
    {
        public int Calls { get; private set; }
        public ToolRuntimeLanguage Language => language;

        public Task<UniversalToolExecutionResult> ExecuteAsync(UniversalToolExecutionRequest request, ToolExecutionContext context, CancellationToken cancellationToken)
        {
            Calls++;
            return Task.FromResult(result);
        }
    }

    private sealed class StubPolicy : IToolExecutionPolicy
    {
        public string Slug => "json";
        public string ExecutionMode => "api";
        public bool IsExecutionEnabled => true;
        public int TimeoutSeconds => 1;
        public int MaxInputSize => 4096;
        public int MaxRequestsPerMinute => 60;
        public int CacheTtlSeconds => 0;
        public ToolHttpMethodPolicy AllowedHttpMethods => ToolHttpMethodPolicy.GetOrPost;
        public bool AllowAnonymous => true;
        public int MaxConcurrency => 1;
        public int RetryCount => 0;
        public int CircuitBreakerFailureThreshold => 5;
    }
}
