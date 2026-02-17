using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services.Pipeline;

public sealed class NoOpClientExecutionStrategy : IClientToolExecutionStrategy
{
    public Task<ToolExecutionResponse?> TryExecuteAsync(string toolId, string action, string input, CancellationToken cancellationToken = default)
        => Task.FromResult<ToolExecutionResponse?>(null);
}
