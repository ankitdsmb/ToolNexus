using Microsoft.Extensions.DependencyInjection;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Infrastructure.Content.Entities;
using ToolNexus.Infrastructure.Data;

namespace ToolNexus.Infrastructure.Observability;

public sealed class TelemetryEventProcessor(
    IServiceScopeFactory scopeFactory,
    ExecutionMetricsAggregator metricsAggregator) : ITelemetryEventProcessor
{
    public async ValueTask ProcessAsync(ToolExecutionEvent executionEvent, CancellationToken cancellationToken)
    {
        using var scope = scopeFactory.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ToolNexusContentDbContext>();
        dbContext.ToolExecutionEvents.Add(Map(executionEvent));
        await metricsAggregator.UpdateAsync(dbContext, executionEvent, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        var intelligenceService = scope.ServiceProvider.GetRequiredService<IToolIntelligenceService>();
        var eventDate = DateOnly.FromDateTime(executionEvent.TimestampUtc.Date);
        await intelligenceService.DetectAndPersistDailyAnomaliesAsync(eventDate, cancellationToken);
    }

    private static ToolExecutionEventEntity Map(ToolExecutionEvent executionEvent)
    {
        return new ToolExecutionEventEntity
        {
            ToolSlug = executionEvent.ToolSlug,
            TimestampUtc = executionEvent.TimestampUtc,
            DurationMs = executionEvent.DurationMs,
            Success = executionEvent.Success,
            ErrorType = executionEvent.ErrorType,
            PayloadSize = executionEvent.PayloadSize,
            ExecutionMode = executionEvent.ExecutionMode
        };
    }
}
