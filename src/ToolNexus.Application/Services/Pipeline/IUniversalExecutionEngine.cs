using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services.Pipeline;

public interface IUniversalExecutionEngine
{
    Task<UniversalToolExecutionResult> ExecuteAsync(
        UniversalToolExecutionRequest request,
        ToolExecutionContext context,
        CancellationToken cancellationToken = default);
}
