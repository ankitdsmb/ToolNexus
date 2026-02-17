using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services.Pipeline;

public interface IToolExecutionPipeline
{
    Task<ToolExecutionResponse> ExecuteAsync(string toolId, string action, string input, CancellationToken cancellationToken = default);
}
