using System.Diagnostics;
using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services.Pipeline;

public sealed class DotNetExecutionAdapter(IApiToolExecutionStrategy strategy) : ILanguageExecutionAdapter
{
    public const string DotNetLanguage = "dotnet";

    public string Language => DotNetLanguage;

    public async Task<UniversalToolExecutionResult> ExecuteAsync(
        UniversalToolExecutionRequest request,
        ToolExecutionContext context,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(context);

        var stopwatch = Stopwatch.StartNew();
        var response = await strategy.ExecuteAsync(
            request.ToolId,
            request.Operation,
            request.InputPayload,
            context.Policy,
            cancellationToken);
        stopwatch.Stop();

        return UniversalToolExecutionResult.FromToolExecutionResponse(response, request, (int)stopwatch.ElapsedMilliseconds);
    }
}
