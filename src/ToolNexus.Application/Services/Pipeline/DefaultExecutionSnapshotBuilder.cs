using ToolNexus.Application.Models;
using ToolNexus.Application.Services.Policies;

namespace ToolNexus.Application.Services.Pipeline;

public sealed class DefaultExecutionSnapshotBuilder : IExecutionSnapshotBuilder
{
    private const string DefaultConformanceVersion = "v1";

    public ExecutionSnapshot BuildSnapshot(
        UniversalToolExecutionRequest request,
        ToolExecutionContext context,
        ExecutionAuthority authority)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(context);

        return new ExecutionSnapshot(
            SnapshotId: Guid.NewGuid().ToString("N"),
            Authority: authority,
            RuntimeLanguage: request.RuntimeLanguage,
            ExecutionCapability: request.ExecutionCapability,
            CorrelationId: request.CorrelationId,
            TenantId: request.TenantId,
            TimestampUtc: DateTime.UtcNow,
            ConformanceVersion: DefaultConformanceVersion,
            PolicySnapshot: CreatePolicySnapshot(context.Policy),
            GovernanceDecisionId: Guid.Empty,
            GovernancePolicyVersion: context.Policy?.Slug ?? "unknown",
            GovernanceStatus: GovernanceDecisionStatus.Denied,
            GovernanceDecisionReason: "Uninitialized",
            GovernanceApprovedBy: "server");
    }

    private static object CreatePolicySnapshot(IToolExecutionPolicy? policy)
    {
        if (policy is null)
        {
            return new Dictionary<string, object?>(StringComparer.Ordinal)
            {
                ["executionMode"] = "unknown",
                ["isExecutionEnabled"] = false
            };
        }

        return new Dictionary<string, object?>(StringComparer.Ordinal)
        {
            ["slug"] = policy.Slug,
            ["executionMode"] = policy.ExecutionMode,
            ["isExecutionEnabled"] = policy.IsExecutionEnabled,
            ["timeoutSeconds"] = policy.TimeoutSeconds,
            ["maxInputSize"] = policy.MaxInputSize,
            ["maxRequestsPerMinute"] = policy.MaxRequestsPerMinute,
            ["cacheTtlSeconds"] = policy.CacheTtlSeconds,
            ["maxConcurrency"] = policy.MaxConcurrency,
            ["retryCount"] = policy.RetryCount,
            ["circuitBreakerFailureThreshold"] = policy.CircuitBreakerFailureThreshold
        };
    }
}
