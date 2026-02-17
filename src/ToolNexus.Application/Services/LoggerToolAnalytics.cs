using Microsoft.Extensions.Logging;

namespace ToolNexus.Application.Services;

public sealed class LoggerToolAnalytics(ILogger<LoggerToolAnalytics> logger) : IToolAnalytics
{
    public void TrackExecution(ToolExecutionAnalytics analytics)
    {
        _ = Task.Run(() =>
            logger.LogInformation(
                "ToolAnalytics {Slug} {Action} {Success} {ExecutionTimeMs} {TimestampUtc}",
                analytics.Slug,
                analytics.Action,
                analytics.Success,
                analytics.ExecutionTimeMs,
                analytics.TimestampUtc));
    }
}
