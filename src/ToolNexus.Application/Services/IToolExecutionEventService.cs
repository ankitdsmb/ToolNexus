using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public interface IToolExecutionEventService
{
    ValueTask RecordAsync(ToolExecutionEvent executionEvent, CancellationToken cancellationToken);
}
