using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services.Pipeline.Steps;

public sealed class ExecutionStep(IUniversalExecutionEngine universalExecutionEngine) : IToolExecutionStep
{
    private const string DefaultLanguage = DotNetExecutionAdapter.DotNetLanguage;
    private const string DefaultToolVersion = "1.0.0";
    private const string LanguageOptionKey = "language";
    private const string ToolVersionOptionKey = "toolVersion";
    private const string ExecutionPolicyIdOptionKey = "executionPolicyId";
    private const string ResourceClassOptionKey = "resourceClass";
    private const string TenantIdOptionKey = "tenantId";
    private const string CorrelationIdOptionKey = "correlationId";

    public int Order => 500;

    public async Task<ToolExecutionResponse> InvokeAsync(ToolExecutionContext context, ToolExecutionDelegate next, CancellationToken cancellationToken)
    {
        if (context.Response is null)
        {
            var request = BuildRequest(context);
            var universalResult = await universalExecutionEngine.ExecuteAsync(request, context, cancellationToken);
            context.Response = universalResult.ToToolExecutionResponse();
        }

        return await next(context, cancellationToken);
    }

    private static UniversalToolExecutionRequest BuildRequest(ToolExecutionContext context)
    {
        var language = ResolveOption(context.Options, LanguageOptionKey, DefaultLanguage);
        var toolVersion = ResolveOption(context.Options, ToolVersionOptionKey, DefaultToolVersion);
        var executionPolicyId = ResolveOption(context.Options, ExecutionPolicyIdOptionKey);
        var resourceClass = ResolveOption(context.Options, ResourceClassOptionKey);
        var tenantId = ResolveOption(context.Options, TenantIdOptionKey);
        var correlationId = ResolveOption(context.Options, CorrelationIdOptionKey);
        var timeoutBudgetMs = context.Policy is null ? 0 : checked(context.Policy.TimeoutSeconds * 1000);

        return new UniversalToolExecutionRequest(
            context.ToolId,
            toolVersion,
            language,
            context.Action,
            context.Input,
            executionPolicyId,
            resourceClass,
            timeoutBudgetMs,
            tenantId,
            correlationId,
            context.Options);
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
