using Microsoft.Extensions.Options;
using ToolNexus.Application.Models;
using ToolNexus.Application.Options;
using ToolNexus.Application.Services.Pipeline;
using Xunit;

namespace ToolNexus.Application.Tests;

public sealed class DefaultExecutionAuthorityResolverTests
{
    [Fact]
    public void ResolveAuthority_DefaultsToLegacy()
    {
        var resolver = CreateResolver(new ExecutionAuthorityOptions());
        var result = resolver.ResolveAuthority(CreateContext(), CreateRequest());

        Assert.Equal(ExecutionAuthority.LegacyAuthoritative, result);
    }

    [Fact]
    public void ResolveAuthority_UsesUnifiedAuthority_WhenEnabledAndLanguageMatches()
    {
        var resolver = CreateResolver(new ExecutionAuthorityOptions
        {
            EnableUnifiedAuthority = true,
            UnifiedAuthorityLanguages = [ToolRuntimeLanguage.Python.Value]
        });

        var result = resolver.ResolveAuthority(CreateContext(), CreateRequest(language: ToolRuntimeLanguage.Python));

        Assert.Equal(ExecutionAuthority.UnifiedAuthoritative, result);
    }

    [Fact]
    public void ResolveAuthority_UsesShadowOnly_WhenEnabledAndMetadataMatches()
    {
        var resolver = CreateResolver(new ExecutionAuthorityOptions
        {
            EnableShadowMode = true,
            ShadowLanguages = [ToolRuntimeLanguage.Python.Value],
            ShadowCapabilities = [ToolExecutionCapability.Sandboxed.Value],
            ShadowRiskTiers = ["high"]
        });

        var context = CreateContext();
        context.Options["riskTier"] = "high";

        var result = resolver.ResolveAuthority(
            context,
            CreateRequest(language: ToolRuntimeLanguage.Python, capability: ToolExecutionCapability.Sandboxed));

        Assert.Equal(ExecutionAuthority.ShadowOnly, result);
    }

    [Fact]
    public void ResolveAuthority_PrefersShadow_WhenBothShadowAndUnifiedMatch()
    {
        var resolver = CreateResolver(new ExecutionAuthorityOptions
        {
            EnableShadowMode = true,
            EnableUnifiedAuthority = true,
            ShadowLanguages = [ToolRuntimeLanguage.Python.Value],
            UnifiedAuthorityLanguages = [ToolRuntimeLanguage.Python.Value]
        });

        var result = resolver.ResolveAuthority(CreateContext(), CreateRequest(language: ToolRuntimeLanguage.Python));

        Assert.Equal(ExecutionAuthority.ShadowOnly, result);
    }

    [Fact]
    public void ResolveAuthority_UsesRequestRiskTierBeforeContextRiskTier()
    {
        var resolver = CreateResolver(new ExecutionAuthorityOptions
        {
            EnableShadowMode = true,
            ShadowLanguages = [ToolRuntimeLanguage.Python.Value],
            ShadowRiskTiers = ["high"]
        });

        var context = CreateContext();
        context.Options["riskTier"] = "low";

        var request = CreateRequest(
            language: ToolRuntimeLanguage.Python,
            options: new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                ["riskTier"] = "high"
            });

        var result = resolver.ResolveAuthority(context, request);

        Assert.Equal(ExecutionAuthority.ShadowOnly, result);
    }

    private static DefaultExecutionAuthorityResolver CreateResolver(ExecutionAuthorityOptions options)
    {
        return new DefaultExecutionAuthorityResolver(Microsoft.Extensions.Options.Options.Create(options));
    }

    private static ToolExecutionContext CreateContext()
    {
        return new ToolExecutionContext("json", "format", "{}", new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase));
    }

    private static UniversalToolExecutionRequest CreateRequest(
        ToolRuntimeLanguage? language = null,
        ToolExecutionCapability? capability = null,
        IDictionary<string, string>? options = null)
    {
        return new UniversalToolExecutionRequest(
            "json",
            "1.0.0",
            language ?? ToolRuntimeLanguage.DotNet,
            "format",
            "{}",
            null,
            null,
            1_000,
            null,
            null,
            capability ?? ToolExecutionCapability.Standard,
            options);
    }
}
