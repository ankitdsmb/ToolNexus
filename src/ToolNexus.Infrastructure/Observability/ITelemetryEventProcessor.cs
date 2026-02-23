using ToolNexus.Application.Models;

namespace ToolNexus.Infrastructure.Observability;

public interface ITelemetryEventProcessor
{
    ValueTask ProcessAsync(ToolExecutionEvent executionEvent, CancellationToken cancellationToken);
}
