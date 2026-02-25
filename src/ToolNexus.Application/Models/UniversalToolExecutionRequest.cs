namespace ToolNexus.Application.Models;

/// <summary>
/// Universal execution request that extends the existing tool execution request
/// contract with runtime metadata required for multi-language adapters.
/// </summary>
public sealed record UniversalToolExecutionRequest(
    string ToolId,
    string ToolVersion,
    ToolRuntimeLanguage RuntimeLanguage,
    string Operation,
    string InputPayload,
    string? ExecutionPolicyId,
    string? ResourceClass,
    int TimeoutBudgetMs,
    string? TenantId,
    string? CorrelationId,
    IDictionary<string, string>? Options = null)
{
    public string Language => RuntimeLanguage.Value;

    public ToolExecutionRequest ToToolExecutionRequest()
    {
        return new ToolExecutionRequest(ToolId, Operation, InputPayload, Options);
    }

    public static UniversalToolExecutionRequest FromToolExecutionRequest(
        ToolExecutionRequest request,
        string language,
        string toolVersion,
        int timeoutBudgetMs,
        string? executionPolicyId = null,
        string? resourceClass = null,
        string? tenantId = null,
        string? correlationId = null)
    {
        return FromToolExecutionRequest(
            request,
            ToolRuntimeLanguage.From(language, ToolRuntimeLanguage.DotNet),
            toolVersion,
            timeoutBudgetMs,
            executionPolicyId,
            resourceClass,
            tenantId,
            correlationId);
    }

    public static UniversalToolExecutionRequest FromToolExecutionRequest(
        ToolExecutionRequest request,
        ToolRuntimeLanguage language,
        string toolVersion,
        int timeoutBudgetMs,
        string? executionPolicyId = null,
        string? resourceClass = null,
        string? tenantId = null,
        string? correlationId = null)
    {
        return new UniversalToolExecutionRequest(
            request.Slug,
            toolVersion,
            language,
            request.Action,
            request.Input,
            executionPolicyId,
            resourceClass,
            timeoutBudgetMs,
            tenantId,
            correlationId,
            request.Options);
    }
}
