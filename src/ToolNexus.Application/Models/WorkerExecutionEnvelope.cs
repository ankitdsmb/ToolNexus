using System.Collections.ObjectModel;

namespace ToolNexus.Application.Models;

/// <summary>
/// Immutable worker envelope representing normalized execution data prepared for external runtime workers.
/// </summary>
public sealed record WorkerExecutionEnvelope
{
    public required string ToolId { get; init; }
    public required string Operation { get; init; }
    public required string InputPayload { get; init; }
    public required IReadOnlyDictionary<string, string> ExecutionPolicySnapshot { get; init; }
    public required IReadOnlyDictionary<string, string> ResourceLimits { get; init; }
    public string? CorrelationId { get; init; }
    public string? TenantId { get; init; }

    public static WorkerExecutionEnvelope Create(
        string toolId,
        string operation,
        string inputPayload,
        IDictionary<string, string>? executionPolicySnapshot,
        IDictionary<string, string>? resourceLimits,
        string? correlationId,
        string? tenantId)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(toolId);
        ArgumentException.ThrowIfNullOrWhiteSpace(operation);
        ArgumentNullException.ThrowIfNull(inputPayload);

        return new WorkerExecutionEnvelope
        {
            ToolId = toolId,
            Operation = operation,
            InputPayload = inputPayload,
            ExecutionPolicySnapshot = new ReadOnlyDictionary<string, string>(
                new Dictionary<string, string>(executionPolicySnapshot ?? new Dictionary<string, string>(), StringComparer.OrdinalIgnoreCase)),
            ResourceLimits = new ReadOnlyDictionary<string, string>(
                new Dictionary<string, string>(resourceLimits ?? new Dictionary<string, string>(), StringComparer.OrdinalIgnoreCase)),
            CorrelationId = correlationId,
            TenantId = tenantId
        };
    }
}
