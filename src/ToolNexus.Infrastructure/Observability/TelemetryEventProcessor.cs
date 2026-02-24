using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Infrastructure.Content.Entities;
using ToolNexus.Infrastructure.Data;

namespace ToolNexus.Infrastructure.Observability;

public sealed class TelemetryEventProcessor(
    IServiceScopeFactory scopeFactory,
    ExecutionMetricsAggregator metricsAggregator,
    ILogger<TelemetryEventProcessor> logger) : ITelemetryEventProcessor
{
    public async ValueTask ProcessAsync(ToolExecutionEvent executionEvent, CancellationToken cancellationToken)
    {
        using var scope = scopeFactory.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ToolNexusContentDbContext>();

        var eventTimestamp = new DateTimeOffset(executionEvent.TimestampUtc, TimeSpan.Zero);

        var alreadyProcessed = await dbContext.ToolExecutionEvents
            .AsNoTracking()
            .AnyAsync(x =>
                x.ToolSlug == executionEvent.ToolSlug
                && x.TimestampUtc == eventTimestamp
                && x.DurationMs == executionEvent.DurationMs
                && x.Success == executionEvent.Success
                && x.ErrorType == executionEvent.ErrorType
                && x.PayloadSize == executionEvent.PayloadSize
                && x.ExecutionMode == executionEvent.ExecutionMode,
                cancellationToken);

        if (alreadyProcessed)
        {
            logger.LogInformation("Skipping duplicate telemetry event for {ToolSlug} at {TimestampUtc}.", executionEvent.ToolSlug, executionEvent.TimestampUtc);
            return;
        }

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
            TimestampUtc = new DateTimeOffset(executionEvent.TimestampUtc, TimeSpan.Zero),
            DurationMs = executionEvent.DurationMs,
            Success = executionEvent.Success,
            ErrorType = executionEvent.ErrorType,
            PayloadSize = executionEvent.PayloadSize,
            ExecutionMode = executionEvent.ExecutionMode
        };
    }
}
