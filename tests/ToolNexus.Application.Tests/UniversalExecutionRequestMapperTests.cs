using ToolNexus.Application.Models;
using ToolNexus.Application.Services.Pipeline;
using ToolNexus.Application.Services.Policies;
using Xunit;

namespace ToolNexus.Application.Tests;

public sealed class UniversalExecutionRequestMapperTests
{
    [Theory]
    [InlineData(null, "dotnet")]
    [InlineData("", "dotnet")]
    [InlineData(" DOTNET ", "dotnet")]
    [InlineData("Python", "python")]
    public void ToolRuntimeLanguage_From_NormalizesLanguage(string? input, string expected)
    {
        var language = ToolRuntimeLanguage.From(input, ToolRuntimeLanguage.DotNet);

        Assert.Equal(expected, language.Value);
    }

    [Fact]
    public void Map_MapsLegacyRequestWithDefaultsAndContextMetadata()
    {
        var mapper = new UniversalExecutionRequestMapper();
        var context = new ToolExecutionContext("json-formatter", "execute", "{}", new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["correlationId"] = " corr-1 ",
            ["tenantId"] = " tenant-a "
        })
        {
            Policy = new StubPolicy()
        };

        var mapped = mapper.Map(context);

        Assert.Equal("json-formatter", mapped.ToolId);
        Assert.Equal("execute", mapped.Operation);
        Assert.Equal(ToolRuntimeLanguage.DotNet, mapped.RuntimeLanguage);
        Assert.Equal("1.0.0", mapped.ToolVersion);
        Assert.Equal(5000, mapped.TimeoutBudgetMs);
        Assert.Equal("corr-1", mapped.CorrelationId);
        Assert.Equal("tenant-a", mapped.TenantId);
    }


    [Fact]
    public void Map_DefaultsExecutionCapabilityToStandard()
    {
        var mapper = new UniversalExecutionRequestMapper();
        var context = new ToolExecutionContext("json-formatter", "execute", "{}", new Dictionary<string, string>());

        var mapped = mapper.Map(context);

        Assert.Equal(ToolExecutionCapability.Standard, mapped.ExecutionCapability);
    }

    private sealed class StubPolicy : IToolExecutionPolicy
    {
        public string Slug => "json";
        public string ExecutionMode => "api";
        public bool IsExecutionEnabled => true;
        public int TimeoutSeconds => 5;
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
