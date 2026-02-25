using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services.Pipeline;

public interface ILanguageExecutionAdapter
{
    string Language { get; }

    Task<UniversalToolExecutionResult> ExecuteAsync(
        UniversalToolExecutionRequest request,
        ToolExecutionContext context,
        CancellationToken cancellationToken);
}
