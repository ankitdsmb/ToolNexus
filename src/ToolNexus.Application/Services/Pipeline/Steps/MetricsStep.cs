using System.Diagnostics;
using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services.Pipeline.Steps;

public sealed class MetricsStep(ToolExecutionMetrics metrics) : IToolExecutionStep
{
    public int Order => 700;

    public async Task<ToolExecutionResponse> InvokeAsync(ToolExecutionContext context, ToolExecutionDelegate next, CancellationToken cancellationToken)
    {
        var tags = new KeyValuePair<string, object?>[]
        {
            new("tool.slug", context.ToolId),
            new("tool.action", context.Action)
        };

        var start = Stopwatch.GetTimestamp();
        metrics.Requests.Add(1, tags);
        var response = await next(context, cancellationToken);
        var duration = Stopwatch.GetElapsedTime(start).TotalMilliseconds;
        metrics.LatencyMs.Record(duration, tags);

        if (!response.Success)
        {
            metrics.Errors.Add(1, tags);
        }

        if (context.CacheHit)
        {
            metrics.CacheHits.Add(1, tags);
        }

        return response;
    }
}
