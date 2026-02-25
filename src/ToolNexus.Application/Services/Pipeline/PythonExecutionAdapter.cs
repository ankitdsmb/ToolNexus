using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services.Pipeline;

public sealed class PythonExecutionAdapter : ILanguageExecutionAdapter
{
    public const string PythonLanguage = "python";

    public string Language => PythonLanguage;

    public Task<UniversalToolExecutionResult> ExecuteAsync(
        UniversalToolExecutionRequest request,
        ToolExecutionContext context,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(context);

        var response = new ToolExecutionResponse(
            false,
            string.Empty,
            "Python adapter is registered for future runtime support but execution is not enabled in this phase.");

        var result = UniversalToolExecutionResult.FromToolExecutionResponse(response, request, durationMs: 0);
        return Task.FromResult(result);
    }
}
