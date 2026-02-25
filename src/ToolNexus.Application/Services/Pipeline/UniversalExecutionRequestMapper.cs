using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;

namespace ToolNexus.Application.Services.Pipeline;

public sealed class UniversalExecutionRequestMapper(
    IToolCatalogService? toolCatalogService = null,
    ILogger<UniversalExecutionRequestMapper>? logger = null)
{
    private const string DefaultToolVersion = "1.0.0";
    private const string LanguageOptionKey = "language";
    private const string ToolVersionOptionKey = "toolVersion";
    private const string ExecutionPolicyIdOptionKey = "executionPolicyId";
    private const string ResourceClassOptionKey = "resourceClass";
    private const string TenantIdOptionKey = "tenantId";
    private const string CorrelationIdOptionKey = "correlationId";
    private const string ExecutionCapabilityOptionKey = "executionCapability";
    private static readonly string[] AuthorityControlOptionKeys =
    [
        "authority",
        "executionAuthority",
        "runtimeAuthority",
        "governanceAuthority",
        LanguageOptionKey,
        ExecutionCapabilityOptionKey
    ];

    private readonly ILogger<UniversalExecutionRequestMapper> _logger = logger ?? NullLogger<UniversalExecutionRequestMapper>.Instance;

    public UniversalToolExecutionRequest Map(ToolExecutionContext context)
    {
        ArgumentNullException.ThrowIfNull(context);

        var sanitizedOptions = SanitizeOptions(context, out var filteredKeys);
        if (filteredKeys.Count > 0)
        {
            _logger.LogWarning(
                "Security incident: authority override options were ignored for tool {ToolId}. blockedKeys={BlockedKeys}",
                context.ToolId,
                string.Join(',', filteredKeys));
        }

        var descriptor = toolCatalogService?.GetBySlug(context.ToolId);

        var runtimeLanguage = ToolRuntimeLanguage.From(descriptor?.RuntimeLanguage, ToolRuntimeLanguage.DotNet);
        var toolVersion = descriptor?.Version ?? ResolveOption(sanitizedOptions, ToolVersionOptionKey, DefaultToolVersion);
        var executionPolicyId = ResolveOption(sanitizedOptions, ExecutionPolicyIdOptionKey);
        var resourceClass = ResolveOption(sanitizedOptions, ResourceClassOptionKey);
        var tenantId = ResolveOption(sanitizedOptions, TenantIdOptionKey);
        var correlationId = ResolveOption(sanitizedOptions, CorrelationIdOptionKey);
        var timeoutBudgetMs = context.Policy is null ? 0 : checked(context.Policy.TimeoutSeconds * 1000);
        var executionCapability = ToolExecutionCapability.From(descriptor?.ExecutionCapability, ToolExecutionCapability.Standard);

        var legacyRequest = new ToolExecutionRequest(context.ToolId, context.Action, context.Input, sanitizedOptions);
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

    private static IDictionary<string, string> SanitizeOptions(ToolExecutionContext context, out IReadOnlyCollection<string> filteredKeys)
    {
        var sanitizedOptions = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        var blocked = new List<string>();

        foreach (var (key, value) in context.Options)
        {
            if (IsAuthorityControlKey(key))
            {
                blocked.Add(key);
                continue;
            }

            sanitizedOptions[key] = value;
        }

        filteredKeys = blocked;
        return sanitizedOptions;
    }

    private static bool IsAuthorityControlKey(string key)
    {
        if (string.IsNullOrWhiteSpace(key))
        {
            return false;
        }

        return key.Contains("authority", StringComparison.OrdinalIgnoreCase)
            || AuthorityControlOptionKeys.Any(blockedKey => string.Equals(blockedKey, key, StringComparison.OrdinalIgnoreCase));
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
