using ToolNexus.Application.Models;
using ToolNexus.Application.Services;

namespace ToolNexus.Infrastructure.Observability;

public sealed class ToolExecutionEventService(
    IBackgroundWorkQueue backgroundWorkQueue,
    ITelemetryEventProcessor telemetryEventProcessor)
    : IToolExecutionEventService
{
    public ValueTask RecordAsync(ToolExecutionEvent executionEvent, CancellationToken cancellationToken)
    {
        return backgroundWorkQueue.QueueAsync(
            ct => telemetryEventProcessor.ProcessAsync(executionEvent, ct),
            cancellationToken);
    }
}
