using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services.Pipeline;

public sealed class PythonExecutionAdapter(IWorkerRuntimeManager workerRuntimeManager) : ILanguageExecutionAdapter
{
    public ToolRuntimeLanguage Language => ToolRuntimeLanguage.Python;

    public async Task<UniversalToolExecutionResult> ExecuteAsync(
        UniversalToolExecutionRequest request,
        ToolExecutionContext context,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(context);

        var envelope = WorkerExecutionEnvelope.Create(
            request.ToolId,
            request.Operation,
            request.InputPayload,
            CreatePolicySnapshot(context),
            CreateResourceLimits(request, context),
            request.CorrelationId,
            request.TenantId);

        var preparation = await workerRuntimeManager.PrepareExecutionAsync(envelope, cancellationToken);
        context.Items[UniversalExecutionEngine.WorkerManagerUsedContextKey] = "true";

        var response = new ToolExecutionResponse(
            false,
            string.Empty,
            $"Python worker runtime is scaffolded but execution is not enabled in this phase ({preparation.Status}).");

        return UniversalToolExecutionResult.FromToolExecutionResponse(response, request, durationMs: 0);
    }

    private static IDictionary<string, string> CreatePolicySnapshot(ToolExecutionContext context)
    {
        if (context.Policy is null)
        {
            return new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        }

        return new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["slug"] = context.Policy.Slug,
            ["executionMode"] = context.Policy.ExecutionMode,
            ["isExecutionEnabled"] = context.Policy.IsExecutionEnabled.ToString().ToLowerInvariant(),
            ["allowedHttpMethods"] = context.Policy.AllowedHttpMethods.ToString()
        };
    }

    private static IDictionary<string, string> CreateResourceLimits(UniversalToolExecutionRequest request, ToolExecutionContext context)
    {
        var limits = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["timeoutBudgetMs"] = request.TimeoutBudgetMs.ToString(),
            ["capability"] = request.Capability
        };

        if (context.Policy is not null)
        {
            limits["maxInputSize"] = context.Policy.MaxInputSize.ToString();
            limits["maxConcurrency"] = context.Policy.MaxConcurrency.ToString();
            limits["maxRequestsPerMinute"] = context.Policy.MaxRequestsPerMinute.ToString();
        }

        return limits;
    }
}
