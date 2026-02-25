using Microsoft.Extensions.Options;
using ToolNexus.Application.Models;
using ToolNexus.Application.Options;

namespace ToolNexus.Application.Services.Pipeline;

public sealed class DefaultExecutionAdmissionController(IOptions<ExecutionAdmissionOptions> options) : IExecutionAdmissionController
{
    private const string DecisionSourceName = "DefaultExecutionAdmissionController";
    private readonly ExecutionAdmissionOptions _options = options.Value;

    public ExecutionAdmissionDecision Evaluate(ExecutionSnapshot snapshot, ToolExecutionContext context)
    {
        ArgumentNullException.ThrowIfNull(snapshot);
        ArgumentNullException.ThrowIfNull(context);

        var metadata = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["authority"] = snapshot.Authority.ToString(),
            ["runtimeLanguage"] = snapshot.RuntimeLanguage.Value,
            ["executionCapability"] = snapshot.ExecutionCapability.Value,
            ["snapshotId"] = snapshot.SnapshotId
        };

        if (snapshot.Authority == ExecutionAuthority.ShadowOnly)
        {
            return new ExecutionAdmissionDecision(false, "ShadowOnly", DecisionSourceName, metadata);
        }

        if (!IsRuntimeLanguageSupported(snapshot.RuntimeLanguage.Value))
        {
            return new ExecutionAdmissionDecision(false, "RuntimeUnavailable", DecisionSourceName, metadata);
        }

        if (IsCapabilityBlocked(snapshot.ExecutionCapability.Value))
        {
            return new ExecutionAdmissionDecision(false, "CapabilityBlocked", DecisionSourceName, metadata);
        }

        return new ExecutionAdmissionDecision(true, "Allowed", DecisionSourceName, metadata);
    }

    private bool IsRuntimeLanguageSupported(string language)
    {
        if (_options.SupportedRuntimeLanguages.Length == 0)
        {
            return true;
        }

        return _options.SupportedRuntimeLanguages.Any(
            supported => string.Equals(supported?.Trim(), language, StringComparison.OrdinalIgnoreCase));
    }

    private bool IsCapabilityBlocked(string capability)
    {
        return _options.BlockedCapabilities.Any(
            blocked => string.Equals(blocked?.Trim(), capability, StringComparison.OrdinalIgnoreCase));
    }
}
