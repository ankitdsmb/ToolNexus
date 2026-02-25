using Microsoft.Extensions.Logging;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
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

    [Fact]
    public void Map_IgnoresMaliciousAuthorityInjectionOptions()
    {
        var logger = new ListLogger<UniversalExecutionRequestMapper>();
        var mapper = new UniversalExecutionRequestMapper(new StubToolCatalogService(), logger);
        var context = new ToolExecutionContext("json-formatter", "execute", "{}", new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["authority"] = "unifiedauthoritative",
            ["executionAuthority"] = "shadowonly",
            ["runtimeAuthority"] = "legacyauthoritative",
            ["safeOption"] = "allowed"
        });

        var mapped = mapper.Map(context);

        Assert.Equal(ToolRuntimeLanguage.DotNet, mapped.RuntimeLanguage);
        Assert.Equal(ToolExecutionCapability.Standard, mapped.ExecutionCapability);
        Assert.DoesNotContain("authority", mapped.Options!.Keys, StringComparer.OrdinalIgnoreCase);
        Assert.DoesNotContain("executionAuthority", mapped.Options!.Keys, StringComparer.OrdinalIgnoreCase);
        Assert.DoesNotContain("runtimeAuthority", mapped.Options!.Keys, StringComparer.OrdinalIgnoreCase);
        Assert.Equal("allowed", mapped.Options!["safeOption"]);
        Assert.Contains(logger.Entries, entry => entry.LogLevel == LogLevel.Warning && entry.Message.Contains("Security incident: authority override options were ignored", StringComparison.Ordinal));
    }

    [Fact]
    public void Map_IgnoresAuthorityOverrideAttemptsAgainstCapabilityMetadata()
    {
        var mapper = new UniversalExecutionRequestMapper(new StubToolCatalogService());
        var context = new ToolExecutionContext("json-formatter", "execute", "{}", new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["language"] = "python",
            ["executionCapability"] = "highresource"
        });

        var mapped = mapper.Map(context);

        Assert.Equal(ToolRuntimeLanguage.DotNet, mapped.RuntimeLanguage);
        Assert.Equal(ToolExecutionCapability.Standard, mapped.ExecutionCapability);
        Assert.DoesNotContain("language", mapped.Options!.Keys, StringComparer.OrdinalIgnoreCase);
        Assert.DoesNotContain("executionCapability", mapped.Options!.Keys, StringComparer.OrdinalIgnoreCase);
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

    private sealed class StubToolCatalogService : IToolCatalogService
    {
        public IReadOnlyCollection<ToolDescriptor> GetAllTools() =>
        [
            new ToolDescriptor
            {
                Slug = "json-formatter",
                Title = "Json Formatter",
                Category = "json",
                Actions = ["execute"],
                SeoTitle = "Json Formatter",
                SeoDescription = "Json Formatter",
                ExampleInput = "{}",
                RuntimeLanguage = "dotnet",
                ExecutionCapability = "standard"
            }
        ];

        public IReadOnlyCollection<string> GetAllCategories() => ["json"];
        public ToolDescriptor? GetBySlug(string slug) => GetAllTools().SingleOrDefault(x => x.Slug == slug);
        public IReadOnlyCollection<ToolDescriptor> GetByCategory(string category) => GetAllTools();
        public bool CategoryExists(string category) => true;
    }

    private sealed class ListLogger<T> : ILogger<T>
    {
        public List<LogEntry> Entries { get; } = [];

        public IDisposable BeginScope<TState>(TState state) where TState : notnull => NullScope.Instance;
        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
        {
            Entries.Add(new LogEntry(logLevel, formatter(state, exception)));
        }

        public sealed record LogEntry(LogLevel LogLevel, string Message);

        private sealed class NullScope : IDisposable
        {
            public static readonly NullScope Instance = new();
            public void Dispose() { }
        }
    }
}
