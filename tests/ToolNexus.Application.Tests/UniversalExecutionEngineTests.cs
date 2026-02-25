using ToolNexus.Application.Models;
using ToolNexus.Application.Services.Pipeline;
using ToolNexus.Application.Services.Policies;
using Xunit;

namespace ToolNexus.Application.Tests;

public sealed class UniversalExecutionEngineTests
{
    [Fact]
    public async Task ExecuteAsync_UsesRegisteredAdapterByLanguage()
    {
        var legacyStrategy = new StubLegacyStrategy(new ToolExecutionResponse(true, "legacy-ok"));
        var authorityResolver = new StubAuthorityResolver(ExecutionAuthority.UnifiedAuthoritative);
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
        var engine = new UniversalExecutionEngine([adapter], legacyStrategy, authorityResolver, new DefaultExecutionConformanceValidator(), new DefaultExecutionSnapshotBuilder());

        var context = new ToolExecutionContext("json", "format", "{}", null)
        {
            Policy = new StubPolicy()
        };

        var result = await engine.ExecuteAsync(
            new UniversalToolExecutionRequest("json", "1.0.0", ToolRuntimeLanguage.DotNet, "format", "{}", null, null, 1000, null, null, ToolExecutionCapability.Standard),
            context,
            CancellationToken.None);

        Assert.True(result.Success);
        Assert.Equal("ok", result.Output);
        Assert.Equal(1, adapter.Calls);
        Assert.Equal(0, legacyStrategy.Calls);
        Assert.Equal("resolved", context.Items[UniversalExecutionEngine.AdapterResolutionStatusContextKey]);
        Assert.Equal(ExecutionAuthority.UnifiedAuthoritative.ToString(), context.Items[UniversalExecutionEngine.ExecutionAuthorityContextKey]);
        Assert.Equal("false", context.Items[UniversalExecutionEngine.ShadowExecutionContextKey]);
        Assert.Equal("true", context.Items[UniversalExecutionEngine.ConformanceValidContextKey]);
        Assert.Equal("false", context.Items[UniversalExecutionEngine.ConformanceNormalizedContextKey]);
        Assert.Equal("0", context.Items[UniversalExecutionEngine.ConformanceIssueCountContextKey]);
        Assert.True(context.Items.ContainsKey(UniversalExecutionEngine.ExecutionSnapshotContextKey));
        Assert.False(string.IsNullOrWhiteSpace(context.Items[UniversalExecutionEngine.ExecutionSnapshotIdContextKey]?.ToString()));
        Assert.Equal(ExecutionAuthority.UnifiedAuthoritative.ToString(), context.Items[UniversalExecutionEngine.SnapshotAuthorityContextKey]);
        Assert.Equal(ToolRuntimeLanguage.DotNet.Value, context.Items[UniversalExecutionEngine.SnapshotLanguageContextKey]);
        Assert.Equal(ToolExecutionCapability.Standard.Value, context.Items[UniversalExecutionEngine.SnapshotCapabilityContextKey]);
    }

    [Fact]
    public async Task ExecuteAsync_ReturnsNormalizedFailureWhenAdapterIsMissing()
    {
        var legacyStrategy = new StubLegacyStrategy(new ToolExecutionResponse(true, "legacy-ok"));
        var authorityResolver = new StubAuthorityResolver(ExecutionAuthority.UnifiedAuthoritative);
        var engine = new UniversalExecutionEngine([], legacyStrategy, authorityResolver, new DefaultExecutionConformanceValidator(), new DefaultExecutionSnapshotBuilder());
        var context = new ToolExecutionContext("json", "format", "{}", null)
        {
            Policy = new StubPolicy()
        };

        var result = await engine.ExecuteAsync(
            new UniversalToolExecutionRequest("json", "1.0.0", ToolRuntimeLanguage.DotNet, "format", "{}", null, null, 1000, null, null, ToolExecutionCapability.Standard),
            context,
            CancellationToken.None);

        Assert.False(result.Success);
        Assert.Contains("No execution adapter registered", result.Error, StringComparison.Ordinal);
        Assert.Equal("missing", context.Items[UniversalExecutionEngine.AdapterResolutionStatusContextKey]);
        Assert.Equal(0, legacyStrategy.Calls);
    }


    [Fact]
    public async Task ExecuteAsync_WhenAdapterResultRequiresNormalization_SetsConformanceTelemetry()
    {
        var legacyStrategy = new StubLegacyStrategy(new ToolExecutionResponse(true, "legacy-ok"));
        var authorityResolver = new StubAuthorityResolver(ExecutionAuthority.UnifiedAuthoritative);
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
            null,
            null,
            null,
            null,
            null));
        var engine = new UniversalExecutionEngine([adapter], legacyStrategy, authorityResolver, new DefaultExecutionConformanceValidator(), new DefaultExecutionSnapshotBuilder());

        var context = new ToolExecutionContext("json", "format", "{}", null)
        {
            Policy = new StubPolicy()
        };

        var result = await engine.ExecuteAsync(
            new UniversalToolExecutionRequest("json", "1.0.0", ToolRuntimeLanguage.DotNet, "format", "{}", null, null, 1000, null, null, ToolExecutionCapability.Standard),
            context,
            CancellationToken.None);

        Assert.Equal("Failed", result.Status);
        Assert.NotNull(result.Metrics);
        Assert.NotNull(result.Incidents);
        Assert.Equal("false", context.Items[UniversalExecutionEngine.ConformanceValidContextKey]);
        Assert.Equal("true", context.Items[UniversalExecutionEngine.ConformanceNormalizedContextKey]);
        Assert.Equal("3", context.Items[UniversalExecutionEngine.ConformanceIssueCountContextKey]);
    }

    [Fact]
    public async Task ExecuteAsync_WhenAuthorityIsLegacy_UsesLegacyExecutionPath()
    {
        var legacyStrategy = new StubLegacyStrategy(new ToolExecutionResponse(true, "legacy-ok"));
        var authorityResolver = new StubAuthorityResolver(ExecutionAuthority.LegacyAuthoritative);
        var adapter = new StubAdapter(ToolRuntimeLanguage.DotNet, new UniversalToolExecutionResult(
            true,
            "adapter-ok",
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
        var engine = new UniversalExecutionEngine([adapter], legacyStrategy, authorityResolver, new DefaultExecutionConformanceValidator(), new DefaultExecutionSnapshotBuilder());
        var context = new ToolExecutionContext("json", "format", "{}", null)
        {
            Policy = new StubPolicy()
        };

        var result = await engine.ExecuteAsync(
            new UniversalToolExecutionRequest("json", "1.0.0", ToolRuntimeLanguage.DotNet, "format", "{}", null, null, 1000, null, null, ToolExecutionCapability.Standard),
            context,
            CancellationToken.None);

        Assert.True(result.Success);
        Assert.Equal("legacy-ok", result.Output);
        Assert.Equal(1, legacyStrategy.Calls);
        Assert.Equal(0, adapter.Calls);
        Assert.Equal("legacy", context.Items[UniversalExecutionEngine.AdapterResolutionStatusContextKey]);
    }

    [Fact]
    public async Task ExecuteAsync_WhenAuthorityIsShadow_SetsShadowMetadataAndUsesAdapter()
    {
        var legacyStrategy = new StubLegacyStrategy(new ToolExecutionResponse(true, "legacy-ok"));
        var authorityResolver = new StubAuthorityResolver(ExecutionAuthority.ShadowOnly);
        var adapter = new StubAdapter(ToolRuntimeLanguage.DotNet, new UniversalToolExecutionResult(
            true,
            "shadow-ok",
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
        var engine = new UniversalExecutionEngine([adapter], legacyStrategy, authorityResolver, new DefaultExecutionConformanceValidator(), new DefaultExecutionSnapshotBuilder());
        var context = new ToolExecutionContext("json", "format", "{}", null)
        {
            Policy = new StubPolicy()
        };

        var result = await engine.ExecuteAsync(
            new UniversalToolExecutionRequest("json", "1.0.0", ToolRuntimeLanguage.DotNet, "format", "{}", null, null, 1000, null, null, ToolExecutionCapability.Standard),
            context,
            CancellationToken.None);

        Assert.True(result.Success);
        Assert.Equal("shadow-ok", result.Output);
        Assert.Equal(1, adapter.Calls);
        Assert.Equal(0, legacyStrategy.Calls);
        Assert.Equal("true", context.Items[UniversalExecutionEngine.ShadowExecutionContextKey]);
        Assert.Equal(ExecutionAuthority.ShadowOnly.ToString(), context.Items[UniversalExecutionEngine.ExecutionAuthorityContextKey]);
        Assert.Equal(ExecutionAuthority.ShadowOnly.ToString(), context.Items[UniversalExecutionEngine.SnapshotAuthorityContextKey]);
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

    private sealed class StubAuthorityResolver(ExecutionAuthority authority) : IExecutionAuthorityResolver
    {
        public ExecutionAuthority ResolveAuthority(ToolExecutionContext context, UniversalToolExecutionRequest request)
        {
            return authority;
        }
    }

    private sealed class StubLegacyStrategy(ToolExecutionResponse response) : IApiToolExecutionStrategy
    {
        public int Calls { get; private set; }

        public Task<ToolExecutionResponse> ExecuteAsync(
            string toolId,
            string action,
            string input,
            IToolExecutionPolicy? policy,
            CancellationToken cancellationToken = default)
        {
            Calls++;
            return Task.FromResult(response);
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
