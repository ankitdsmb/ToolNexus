using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public interface IToolExecutionPreProcessor
{
    ValueTask<ToolExecutionRequest> ProcessAsync(ToolExecutionRequest request, CancellationToken cancellationToken = default);
}
