using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services.Pipeline;

public sealed class UniversalExecutionRequestMapper
{
    private const string DefaultToolVersion = "1.0.0";
    private const string LanguageOptionKey = "language";
    private const string ToolVersionOptionKey = "toolVersion";
    private const string ExecutionPolicyIdOptionKey = "executionPolicyId";
    private const string ResourceClassOptionKey = "resourceClass";
    private const string TenantIdOptionKey = "tenantId";
    private const string CorrelationIdOptionKey = "correlationId";
    private const string ExecutionCapabilityOptionKey = "executionCapability";

    public UniversalToolExecutionRequest Map(ToolExecutionContext context)
    {
        ArgumentNullException.ThrowIfNull(context);

        var runtimeLanguage = ToolRuntimeLanguage.From(ResolveOption(context.Options, LanguageOptionKey), ToolRuntimeLanguage.DotNet);
        var toolVersion = ResolveOption(context.Options, ToolVersionOptionKey, DefaultToolVersion);
        var executionPolicyId = ResolveOption(context.Options, ExecutionPolicyIdOptionKey);
        var resourceClass = ResolveOption(context.Options, ResourceClassOptionKey);
        var tenantId = ResolveOption(context.Options, TenantIdOptionKey);
        var correlationId = ResolveOption(context.Options, CorrelationIdOptionKey);
        var timeoutBudgetMs = context.Policy is null ? 0 : checked(context.Policy.TimeoutSeconds * 1000);
        var executionCapability = ToolExecutionCapability.From(ResolveOption(context.Options, ExecutionCapabilityOptionKey), ToolExecutionCapability.Standard);

        var legacyRequest = new ToolExecutionRequest(context.ToolId, context.Action, context.Input, context.Options);
        return UniversalToolExecutionRequest.FromToolExecutionRequest(
            legacyRequest,
            runtimeLanguage,
            toolVersion,
            timeoutBudgetMs,
            executionPolicyId,
            resourceClass,
            tenantId,
            correlationId,
            executionCapability);
    }

    private static string ResolveOption(IDictionary<string, string> options, string key, string defaultValue)
    {
        return ResolveOption(options, key) ?? defaultValue;
    }

    private static string? ResolveOption(IDictionary<string, string> options, string key)
    {
        if (options.TryGetValue(key, out var value) && !string.IsNullOrWhiteSpace(value))
        {
            return value.Trim();
        }

        return null;
    }
}
