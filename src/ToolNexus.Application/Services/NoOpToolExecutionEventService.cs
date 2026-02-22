using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public sealed class NoOpToolExecutionEventService : IToolExecutionEventService
{
    public ValueTask RecordAsync(ToolExecutionEvent executionEvent, CancellationToken cancellationToken)
        => ValueTask.CompletedTask;
}
