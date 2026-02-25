using Microsoft.Extensions.Options;
using ToolNexus.Application.Models;
using ToolNexus.Application.Options;

namespace ToolNexus.Application.Services.Pipeline;

public sealed class DefaultExecutionAuthorityResolver(IOptions<ExecutionAuthorityOptions> options) : IExecutionAuthorityResolver
{
    private readonly ExecutionAuthorityOptions _options = options.Value;

    public ExecutionAuthority ResolveAuthority(ToolExecutionContext context, UniversalToolExecutionRequest request)
    {
        ArgumentNullException.ThrowIfNull(context);
        ArgumentNullException.ThrowIfNull(request);

        var riskTier = ResolveRiskTier(context);

        if (_options.EnableShadowMode
            && IsMatch(request.Language, _options.ShadowLanguages)
            && IsMatch(request.Capability, _options.ShadowCapabilities)
            && IsRiskTierMatch(riskTier, _options.ShadowRiskTiers))
        {
            return ExecutionAuthority.ShadowOnly;
        }

        if (_options.EnableUnifiedAuthority
            && IsMatch(request.Language, _options.UnifiedAuthorityLanguages)
            && IsMatch(request.Capability, _options.UnifiedAuthorityCapabilities))
        {
            return ExecutionAuthority.UnifiedAuthoritative;
        }

        return ExecutionAuthority.LegacyAuthoritative;
    }

    private static string? ResolveRiskTier(ToolExecutionContext context)
    {
        return context.Manifest?.SecurityLevel.ToString();
    }

    private static bool IsRiskTierMatch(string? value, IReadOnlyCollection<string> configuredValues)
    {
        if (configuredValues.Count == 0)
        {
            return true;
        }

        return !string.IsNullOrWhiteSpace(value)
            && configuredValues.Contains(value, StringComparer.OrdinalIgnoreCase);
    }

    private static bool IsMatch(string value, IReadOnlyCollection<string> configuredValues)
    {
        return configuredValues.Count == 0
            || configuredValues.Contains(value, StringComparer.OrdinalIgnoreCase);
    }
}
