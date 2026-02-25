using ToolNexus.Application.Models;
using ToolNexus.Application.Services.Pipeline;

namespace ToolNexus.Application.Tests;

public sealed class DefaultExecutionConformanceValidatorTests
{
    private static readonly UniversalToolExecutionRequest Request = new(
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

    [Fact]
    public void Validate_MissingStatus_NormalizesToFailed()
    {
        var validator = new DefaultExecutionConformanceValidator();
        var result = CreateResult(status: null, metrics: new Dictionary<string, string>(), incidents: Array.Empty<string>());

        var conformance = validator.Validate(result, Request);

        Assert.False(conformance.IsValid);
        Assert.True(conformance.WasNormalized);
        Assert.Equal("Failed", conformance.NormalizedStatus);
        Assert.Equal("Failed", conformance.NormalizedResult.Status);
        Assert.Contains(conformance.ConformanceIssues, issue => issue.Contains("Missing status", StringComparison.Ordinal));
    }

    [Fact]
    public void Validate_InvalidStatus_NormalizesToFailed()
    {
        var validator = new DefaultExecutionConformanceValidator();
        var result = CreateResult(status: "Unknown", metrics: new Dictionary<string, string>(), incidents: Array.Empty<string>());

        var conformance = validator.Validate(result, Request);

        Assert.False(conformance.IsValid);
        Assert.True(conformance.WasNormalized);
        Assert.Equal("Failed", conformance.NormalizedStatus);
        Assert.Contains(conformance.ConformanceIssues, issue => issue.Contains("Unknown status", StringComparison.Ordinal));
    }

    [Fact]
    public void Validate_MissingMetrics_AutoFillsMetrics()
    {
        var validator = new DefaultExecutionConformanceValidator();
        var result = CreateResult(status: "Succeeded", metrics: null, incidents: Array.Empty<string>());

        var conformance = validator.Validate(result, Request);

        Assert.NotNull(conformance.NormalizedResult.Metrics);
        Assert.Empty(conformance.NormalizedResult.Metrics!);
        Assert.True(conformance.WasNormalized);
    }

    [Fact]
    public void Validate_MissingIncidents_AutoFillsIncidents()
    {
        var validator = new DefaultExecutionConformanceValidator();
        var result = CreateResult(status: "Succeeded", metrics: new Dictionary<string, string>(), incidents: null);

        var conformance = validator.Validate(result, Request);

        Assert.NotNull(conformance.NormalizedResult.Incidents);
        Assert.Empty(conformance.NormalizedResult.Incidents!);
        Assert.True(conformance.WasNormalized);
    }

    private static UniversalToolExecutionResult CreateResult(string? status, IDictionary<string, string>? metrics, IReadOnlyList<string>? incidents)
    {
        return new UniversalToolExecutionResult(
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
            1,
            null,
            null,
            null,
            status,
            metrics,
            incidents);
    }
}
