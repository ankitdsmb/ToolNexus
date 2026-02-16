using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public interface IToolService
{
    Task<ToolExecutionResponse> ExecuteAsync(ToolExecutionRequest request, CancellationToken cancellationToken = default);
}
