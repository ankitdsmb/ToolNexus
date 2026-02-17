using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public interface IToolExecutionPipeline
{
    Task<ToolExecutionResponse> ExecuteAsync(
        string slug,
        string action,
        string input,
        CancellationToken cancellationToken);
}
