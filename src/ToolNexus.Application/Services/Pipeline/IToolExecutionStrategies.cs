using ToolNexus.Application.Models;
using ToolNexus.Application.Services.Policies;

namespace ToolNexus.Application.Services.Pipeline;

public interface IClientToolExecutionStrategy
{
    Task<ToolExecutionResponse?> TryExecuteAsync(string toolId, string action, string input, CancellationToken cancellationToken = default);
}

public interface IApiToolExecutionStrategy
{
    Task<ToolExecutionResponse> ExecuteAsync(string toolId, string action, string input, IToolExecutionPolicy? policy, CancellationToken cancellationToken = default);

    Task<UniversalExecutionResult> ExecuteAsync(UniversalExecutionRequest request, IToolExecutionPolicy? policy, CancellationToken cancellationToken = default);
}
