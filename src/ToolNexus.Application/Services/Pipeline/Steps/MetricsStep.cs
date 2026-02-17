using System.Diagnostics;
using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services.Pipeline.Steps;

public sealed class MetricsStep(ToolExecutionMetrics metrics) : IToolExecutionStep
{
    public int Order => 700;

    public async Task<ToolExecutionResponse> InvokeAsync(ToolExecutionContext context, ToolExecutionDelegate next, CancellationToken cancellationToken)
    {
        var tags = CreateTags(context);

        var start = Stopwatch.GetTimestamp();
        metrics.Requests.Add(1, tags);
        var response = await next(context, cancellationToken);
        var duration = Stopwatch.GetElapsedTime(start).TotalMilliseconds;
        metrics.LatencyMs.Record(duration, tags);

        if (!response.Success)
        {
            metrics.Errors.Add(1, tags);
        }

        if (context.CacheStatus == "hit")
        {
            metrics.CacheHits.Add(1, tags);
        }
        else if (context.CacheStatus == "miss")
        {
            metrics.CacheMisses.Add(1, tags);
        }

        return response;
    }

    private static KeyValuePair<string, object?>[] CreateTags(ToolExecutionContext context)
    {
        return
        [
            new("tool_slug", context.ToolId),
            new("action", context.Action),
            new("cache_status", context.CacheStatus)
        ];
    }
}
