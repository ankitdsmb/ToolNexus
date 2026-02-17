using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public interface IToolResponseCache
{
    Task<ToolExecutionResponse?> GetAsync(
        string slug,
        string action,
        string input,
        CancellationToken cancellationToken = default);

    Task SetAsync(
        string slug,
        string action,
        string input,
        ToolExecutionResponse response,
        CancellationToken cancellationToken = default);
}
