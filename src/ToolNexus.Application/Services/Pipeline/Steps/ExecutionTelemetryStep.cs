using System.Diagnostics;
using System.Text;
using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services.Pipeline.Steps;

public sealed class ExecutionTelemetryStep(IToolExecutionEventService executionEventService) : IToolExecutionStep
{
    public int Order => 650;

    public async Task<ToolExecutionResponse> InvokeAsync(ToolExecutionContext context, ToolExecutionDelegate next, CancellationToken cancellationToken)
    {
        var timestampUtc = DateTime.UtcNow;
        var start = Stopwatch.GetTimestamp();

        try
        {
            var response = await next(context, cancellationToken);
            var durationMs = (long)Stopwatch.GetElapsedTime(start).TotalMilliseconds;
            await executionEventService.RecordAsync(CreateEvent(context, timestampUtc, durationMs, response.Success, null), cancellationToken);
            return response;
        }
        catch (Exception ex)
        {
            var durationMs = (long)Stopwatch.GetElapsedTime(start).TotalMilliseconds;
            await executionEventService.RecordAsync(CreateEvent(context, timestampUtc, durationMs, success: false, ex.GetType().Name), cancellationToken);
            throw;
        }
    }

    private static ToolExecutionEvent CreateEvent(ToolExecutionContext context, DateTime timestampUtc, long durationMs, bool success, string? errorType)
    {
        return new ToolExecutionEvent
        {
            ToolSlug = context.ToolId,
            TimestampUtc = timestampUtc,
            DurationMs = durationMs,
            Success = success,
            ErrorType = errorType,
            PayloadSize = Encoding.UTF8.GetByteCount(context.Input),
            ExecutionMode = context.Policy?.ExecutionMode ?? "unknown",
            Language = ResolveTag(context, UniversalExecutionEngine.LanguageContextKey, "unknown"),
            AdapterName = ResolveTag(context, UniversalExecutionEngine.AdapterNameContextKey, "unknown"),
            AdapterResolutionStatus = ResolveTag(context, UniversalExecutionEngine.AdapterResolutionStatusContextKey, "unknown"),
            Capability = ResolveTag(context, UniversalExecutionEngine.CapabilityContextKey, "standard"),
            WorkerManagerUsed = ResolveTag(context, UniversalExecutionEngine.WorkerManagerUsedContextKey, "false"),
            LeaseAcquired = ResolveTag(context, UniversalExecutionEngine.WorkerLeaseAcquiredContextKey, "false"),
            WorkerLeaseState = ResolveTag(context, UniversalExecutionEngine.WorkerLeaseStateContextKey, WorkerLeaseState.Released.ToString()),
            OrchestratorUsed = ResolveTag(context, UniversalExecutionEngine.WorkerOrchestratorUsedContextKey, "false"),
            ExecutionAuthority = ResolveTag(context, UniversalExecutionEngine.ExecutionAuthorityContextKey, ExecutionAuthority.LegacyAuthoritative.ToString()),
            ShadowExecution = ResolveTag(context, UniversalExecutionEngine.ShadowExecutionContextKey, "false"),
            ConformanceValid = ResolveTag(context, UniversalExecutionEngine.ConformanceValidContextKey, "true"),
            ConformanceNormalized = ResolveTag(context, UniversalExecutionEngine.ConformanceNormalizedContextKey, "false"),
            ConformanceIssueCount = ResolveIntTag(context, UniversalExecutionEngine.ConformanceIssueCountContextKey, 0),
            ExecutionSnapshotId = ResolveTag(context, UniversalExecutionEngine.ExecutionSnapshotIdContextKey, string.Empty),
            SnapshotAuthority = ResolveTag(context, UniversalExecutionEngine.SnapshotAuthorityContextKey, ExecutionAuthority.LegacyAuthoritative.ToString()),
            SnapshotLanguage = ResolveTag(context, UniversalExecutionEngine.SnapshotLanguageContextKey, "unknown"),
            SnapshotCapability = ResolveTag(context, UniversalExecutionEngine.SnapshotCapabilityContextKey, "standard")
        };
    }

    private static int ResolveIntTag(ToolExecutionContext context, string key, int defaultValue)
    {
        if (context.Items.TryGetValue(key, out var value)
            && value is string tag
            && int.TryParse(tag, out var parsed))
        {
            return parsed;
        }

        return defaultValue;
    }

    private static string ResolveTag(ToolExecutionContext context, string key, string defaultValue)
    {
        if (context.Items.TryGetValue(key, out var value) && value is string tag && !string.IsNullOrWhiteSpace(tag))
        {
            return tag;
        }

        return defaultValue;
    }
}
