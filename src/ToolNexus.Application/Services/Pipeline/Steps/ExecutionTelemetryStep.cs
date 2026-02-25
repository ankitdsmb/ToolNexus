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
        context.Items.TryGetValue(ExecutionStep.RuntimeLanguageContextKey, out var runtimeLanguage);
        context.Items.TryGetValue(ExecutionStep.AdapterNameContextKey, out var adapterName);
        context.Items.TryGetValue(ExecutionStep.AdapterResolutionStatusContextKey, out var adapterResolutionStatus);

        return new ToolExecutionEvent
        {
            ToolSlug = context.ToolId,
            TimestampUtc = timestampUtc,
            DurationMs = durationMs,
            Success = success,
            ErrorType = errorType,
            PayloadSize = Encoding.UTF8.GetByteCount(context.Input),
            ExecutionMode = context.Policy?.ExecutionMode ?? "unknown",
            RuntimeLanguage = runtimeLanguage?.ToString() ?? "dotnet",
            AdapterName = adapterName?.ToString() ?? "unknown",
            AdapterResolutionStatus = adapterResolutionStatus?.ToString() ?? "unknown"
        };
    }
}
