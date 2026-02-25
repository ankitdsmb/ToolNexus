using ToolNexus.Application.Models;
using ToolNexus.Application.Services.Pipeline;
using ToolNexus.Application.Services.Policies;
using Xunit;

namespace ToolNexus.Application.Tests;

public sealed class DefaultExecutionSnapshotBuilderTests
{
    [Fact]
    public void BuildSnapshot_CreatesImmutableSnapshotWithExpectedMetadata()
    {
        var builder = new DefaultExecutionSnapshotBuilder();
        var request = new UniversalToolExecutionRequest(
            "json",
            "1.0.0",
            ToolRuntimeLanguage.Python,
            "format",
            "{}",
            "policy-1",
            "standard",
            1000,
            "tenant-1",
            "corr-1",
            ToolExecutionCapability.Sandboxed);
        var context = new ToolExecutionContext("json", "format", "{}", null)
        {
            Policy = new StubPolicy()
        };

        var snapshot = builder.BuildSnapshot(request, context, ExecutionAuthority.ShadowOnly);

        Assert.False(string.IsNullOrWhiteSpace(snapshot.SnapshotId));
        Assert.Equal(ExecutionAuthority.ShadowOnly, snapshot.Authority);
        Assert.Equal(ToolRuntimeLanguage.Python, snapshot.RuntimeLanguage);
        Assert.Equal(ToolExecutionCapability.Sandboxed, snapshot.ExecutionCapability);
        Assert.Equal("corr-1", snapshot.CorrelationId);
        Assert.Equal("tenant-1", snapshot.TenantId);
        Assert.Equal("v1", snapshot.ConformanceVersion);
    }



    [Fact]
    public void BuildSnapshot_UsesDefaultPolicySnapshot_WhenContextPolicyMissing()
    {
        var builder = new DefaultExecutionSnapshotBuilder();
        var request = new UniversalToolExecutionRequest(
            "json",
            "1.0.0",
            ToolRuntimeLanguage.DotNet,
            "format",
            "{}",
            null,
            null,
            1000,
            null,
            null,
            ToolExecutionCapability.Standard);
        var context = new ToolExecutionContext("json", "format", "{}", null);

        var snapshot = builder.BuildSnapshot(request, context, ExecutionAuthority.UnifiedAuthoritative);

        var policySnapshot = Assert.IsType<Dictionary<string, object?>>(snapshot.PolicySnapshot);
        Assert.Equal("unknown", policySnapshot["executionMode"]);
        Assert.Equal(false, policySnapshot["isExecutionEnabled"]);
    }

    [Fact]
    public void ExecutionSnapshot_IsImmutable()
    {
        var snapshot = new ExecutionSnapshot(
            "id",
            ExecutionAuthority.UnifiedAuthoritative,
            ToolRuntimeLanguage.DotNet,
            ToolExecutionCapability.Standard,
            "corr",
            "tenant",
            DateTime.UtcNow,
            "v1",
            new { mode = "server" });

        var updated = snapshot with { SnapshotId = "updated" };

        Assert.Equal("id", snapshot.SnapshotId);
        Assert.Equal("updated", updated.SnapshotId);
    }

    private sealed class StubPolicy : IToolExecutionPolicy
    {
        public string Slug => "json";
        public string ExecutionMode => "server";
        public bool IsExecutionEnabled => true;
        public int TimeoutSeconds => 30;
        public int MaxInputSize => 4096;
        public int MaxRequestsPerMinute => 60;
        public int CacheTtlSeconds => 0;
        public ToolHttpMethodPolicy AllowedHttpMethods => ToolHttpMethodPolicy.GetOrPost;
        public bool AllowAnonymous => true;
        public int MaxConcurrency => 2;
        public int RetryCount => 1;
        public int CircuitBreakerFailureThreshold => 3;
    }
}
