using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services.Pipeline;

public interface ILanguageExecutionAdapter
{
    ToolRuntimeLanguage Language { get; }

    Task<UniversalToolExecutionResult> ExecuteAsync(
        UniversalToolExecutionRequest request,
        ToolExecutionContext context,
        CancellationToken cancellationToken);
}
