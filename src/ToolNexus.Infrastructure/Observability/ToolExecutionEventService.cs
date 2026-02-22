using System.Threading.Channels;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Infrastructure.Content.Entities;
using ToolNexus.Infrastructure.Data;

namespace ToolNexus.Infrastructure.Observability;

public sealed class ToolExecutionEventService(
    IServiceScopeFactory scopeFactory,
    ExecutionMetricsAggregator metricsAggregator,
    ILogger<ToolExecutionEventService> logger)
    : BackgroundService, IToolExecutionEventService
{
    private readonly Channel<ToolExecutionEvent> _channel = Channel.CreateUnbounded<ToolExecutionEvent>(new UnboundedChannelOptions
    {
        SingleReader = true,
        SingleWriter = false,
        AllowSynchronousContinuations = false
    });

    public ValueTask RecordAsync(ToolExecutionEvent executionEvent, CancellationToken cancellationToken)
    {
        if (_channel.Writer.TryWrite(executionEvent))
        {
            return ValueTask.CompletedTask;
        }

        return _channel.Writer.WriteAsync(executionEvent, cancellationToken);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var executionEvent in _channel.Reader.ReadAllAsync(stoppingToken))
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                var dbContext = scope.ServiceProvider.GetRequiredService<ToolNexusContentDbContext>();
                dbContext.ToolExecutionEvents.Add(Map(executionEvent));
                await metricsAggregator.UpdateAsync(dbContext, executionEvent, stoppingToken);
                await dbContext.SaveChangesAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to persist execution telemetry for tool {ToolSlug}.", executionEvent.ToolSlug);
            }
        }
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
