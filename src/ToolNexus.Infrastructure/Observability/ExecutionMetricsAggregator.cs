using Microsoft.EntityFrameworkCore;
using ToolNexus.Application.Models;
using ToolNexus.Infrastructure.Content.Entities;
using ToolNexus.Infrastructure.Data;

namespace ToolNexus.Infrastructure.Observability;

public sealed class ExecutionMetricsAggregator
{
    public async Task UpdateAsync(ToolNexusContentDbContext dbContext, ToolExecutionEvent executionEvent, CancellationToken cancellationToken)
    {
        var dayUtc = executionEvent.TimestampUtc.Date;

        var metrics = await dbContext.DailyToolMetrics
            .SingleOrDefaultAsync(
                x => x.ToolSlug == executionEvent.ToolSlug && x.DateUtc == dayUtc,
                cancellationToken);

        if (metrics is null)
        {
            metrics = new DailyToolMetricsEntity
            {
                ToolSlug = executionEvent.ToolSlug,
                DateUtc = dayUtc,
                TotalExecutions = 1,
                SuccessCount = executionEvent.Success ? 1 : 0,
                FailureCount = executionEvent.Success ? 0 : 1,
                AvgDurationMs = executionEvent.DurationMs,
                MaxDurationMs = executionEvent.DurationMs,
                TotalPayloadSize = executionEvent.PayloadSize
            };

            dbContext.DailyToolMetrics.Add(metrics);
            return;
        }

        var nextTotalExecutions = metrics.TotalExecutions + 1;
        metrics.AvgDurationMs = ((metrics.AvgDurationMs * metrics.TotalExecutions) + executionEvent.DurationMs) / nextTotalExecutions;
        metrics.TotalExecutions = nextTotalExecutions;
        metrics.SuccessCount += executionEvent.Success ? 1 : 0;
        metrics.FailureCount += executionEvent.Success ? 0 : 1;
        metrics.MaxDurationMs = Math.Max(metrics.MaxDurationMs, executionEvent.DurationMs);
        metrics.TotalPayloadSize += executionEvent.PayloadSize;
    }
}
