using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services.Pipeline;

public interface IClientToolExecutionStrategy
{
    Task<ToolExecutionResponse?> TryExecuteAsync(string toolId, string action, string input, CancellationToken cancellationToken = default);
}

public interface IApiToolExecutionStrategy
{
    Task<ToolExecutionResponse> ExecuteAsync(string toolId, string action, string input, CancellationToken cancellationToken = default);
}
