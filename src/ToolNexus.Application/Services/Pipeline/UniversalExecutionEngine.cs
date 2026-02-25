using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services.Pipeline;

public sealed class UniversalExecutionEngine(
    IEnumerable<ILanguageExecutionAdapter> adapters,
    IApiToolExecutionStrategy legacyExecutionStrategy,
    IExecutionAuthorityResolver authorityResolver,
    IExecutionConformanceValidator conformanceValidator,
    IExecutionSnapshotBuilder executionSnapshotBuilder) : IUniversalExecutionEngine
{
    public const string LanguageContextKey = "runtime.language";
    public const string AdapterNameContextKey = "runtime.adapterName";
    public const string AdapterResolutionStatusContextKey = "runtime.adapterResolutionStatus";
    public const string CapabilityContextKey = "runtime.capability";
    public const string WorkerManagerUsedContextKey = "runtime.workerManagerUsed";
    public const string WorkerLeaseAcquiredContextKey = "runtime.workerLeaseAcquired";
    public const string WorkerLeaseStateContextKey = "runtime.workerLeaseState";
    public const string WorkerOrchestratorUsedContextKey = "runtime.workerOrchestratorUsed";
    public const string ExecutionAuthorityContextKey = "runtime.executionAuthority";
    public const string ShadowExecutionContextKey = "runtime.shadowExecution";
    public const string ConformanceValidContextKey = "runtime.conformanceValid";
    public const string ConformanceNormalizedContextKey = "runtime.conformanceNormalized";
    public const string ConformanceIssueCountContextKey = "runtime.conformanceIssueCount";
    public const string ExecutionSnapshotContextKey = "runtime.executionSnapshot";
    public const string ExecutionSnapshotIdContextKey = "runtime.executionSnapshotId";
    public const string SnapshotAuthorityContextKey = "runtime.snapshotAuthority";
    public const string SnapshotLanguageContextKey = "runtime.snapshotLanguage";
    public const string SnapshotCapabilityContextKey = "runtime.snapshotCapability";

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
        context.Items[ShadowExecutionContextKey] = "false";
        context.Items[ConformanceValidContextKey] = "true";
        context.Items[ConformanceNormalizedContextKey] = "false";
        context.Items[ConformanceIssueCountContextKey] = "0";

        var authority = authorityResolver.ResolveAuthority(context, request);
        context.Items[ExecutionAuthorityContextKey] = authority.ToString();

        var executionSnapshot = executionSnapshotBuilder.BuildSnapshot(request, context, authority);
        context.Items[ExecutionSnapshotContextKey] = executionSnapshot;
        context.Items[ExecutionSnapshotIdContextKey] = executionSnapshot.SnapshotId;
        context.Items[SnapshotAuthorityContextKey] = executionSnapshot.Authority.ToString();
        context.Items[SnapshotLanguageContextKey] = executionSnapshot.RuntimeLanguage.Value;
        context.Items[SnapshotCapabilityContextKey] = executionSnapshot.ExecutionCapability.Value;

        if (authority == ExecutionAuthority.LegacyAuthoritative)
        {
            context.Items[AdapterNameContextKey] = "LegacyDotNetStrategy";
            context.Items[AdapterResolutionStatusContextKey] = "legacy";

            var response = await legacyExecutionStrategy.ExecuteAsync(
                request.ToolId,
                request.Operation,
                request.InputPayload,
                context.Policy,
                cancellationToken);

            return UniversalToolExecutionResult.FromToolExecutionResponse(response, request, durationMs: 0);
        }

        if (authority == ExecutionAuthority.ShadowOnly)
        {
            context.Items[ShadowExecutionContextKey] = "true";
        }

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

        var adapterResult = await adapter.ExecuteAsync(request with { RuntimeLanguage = language }, context, cancellationToken);
        var conformance = conformanceValidator.Validate(adapterResult, request);

        context.Items[ConformanceValidContextKey] = conformance.IsValid ? "true" : "false";
        context.Items[ConformanceNormalizedContextKey] = conformance.WasNormalized ? "true" : "false";
        context.Items[ConformanceIssueCountContextKey] = conformance.ConformanceIssues.Count.ToString(System.Globalization.CultureInfo.InvariantCulture);

        return conformance.NormalizedResult;
    }
}
