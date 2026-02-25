using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services.Pipeline;

public sealed class UniversalExecutionEngine(IEnumerable<ILanguageExecutionAdapter> adapters) : IUniversalExecutionEngine
{
    private readonly IReadOnlyDictionary<string, ILanguageExecutionAdapter> _adaptersByLanguage = adapters
        .ToDictionary(adapter => adapter.Language, StringComparer.OrdinalIgnoreCase);

    public async Task<UniversalToolExecutionResult> ExecuteAsync(
        UniversalToolExecutionRequest request,
        ToolExecutionContext context,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(context);

        var language = request.Language.Trim();
        if (string.IsNullOrWhiteSpace(language))
        {
            throw new InvalidOperationException("Execution language is required.");
        }

        if (!_adaptersByLanguage.TryGetValue(language, out var adapter))
        {
            throw new InvalidOperationException($"No execution adapter registered for language '{language}'.");
        }

        return await adapter.ExecuteAsync(request, context, cancellationToken);
    }
}
