using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services.Pipeline;

public sealed class UniversalExecutionEngine(IEnumerable<ILanguageExecutionAdapter> adapters) : IUniversalExecutionEngine
{
    public const string LanguageContextKey = "runtime.language";
    public const string AdapterNameContextKey = "runtime.adapterName";
    public const string AdapterResolutionStatusContextKey = "runtime.adapterResolutionStatus";
    public const string CapabilityContextKey = "runtime.capability";
    public const string WorkerManagerUsedContextKey = "runtime.workerManagerUsed";
    public const string WorkerLeaseAcquiredContextKey = "runtime.workerLeaseAcquired";
    public const string WorkerLeaseStateContextKey = "runtime.workerLeaseState";
    public const string WorkerOrchestratorUsedContextKey = "runtime.workerOrchestratorUsed";

    private readonly IReadOnlyDictionary<string, ILanguageExecutionAdapter> _adaptersByLanguage = adapters
        .ToDictionary(adapter => adapter.Language.Value, StringComparer.OrdinalIgnoreCase);

    public async Task<UniversalToolExecutionResult> ExecuteAsync(
        UniversalToolExecutionRequest request,
        ToolExecutionContext context,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(context);

        var language = ToolRuntimeLanguage.From(request.Language, ToolRuntimeLanguage.DotNet);
        context.Items[LanguageContextKey] = language.Value;
        context.Items[CapabilityContextKey] = request.Capability;
        context.Items[WorkerManagerUsedContextKey] = "false";
        context.Items[WorkerLeaseAcquiredContextKey] = "false";
        context.Items[WorkerLeaseStateContextKey] = WorkerLeaseState.Released.ToString();
        context.Items[WorkerOrchestratorUsedContextKey] = "false";

        if (!_adaptersByLanguage.TryGetValue(language.Value, out var adapter))
        {
            context.Items[AdapterNameContextKey] = "none";
            context.Items[AdapterResolutionStatusContextKey] = "missing";

            return new UniversalToolExecutionResult(
                false,
                string.Empty,
                $"No execution adapter registered for language '{language.Value}'.",
                false,
                request.ToolId,
                request.ToolVersion,
                language.Value,
                request.Operation,
                request.ExecutionPolicyId,
                request.ResourceClass,
                0,
                request.TenantId,
                request.CorrelationId,
                null);
        }

        context.Items[AdapterNameContextKey] = adapter.GetType().Name;
        context.Items[AdapterResolutionStatusContextKey] = "resolved";

        return await adapter.ExecuteAsync(request with { RuntimeLanguage = language }, context, cancellationToken);
    }
}
