using ToolNexus.Application.Abstractions;
using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services.Pipeline;

public sealed class UniversalExecutionRequestMapper : IUniversalExecutionRequestMapper
{
    public UniversalExecutionRequest Map(ToolExecutionContext context)
    {
        ArgumentNullException.ThrowIfNull(context);

        var correlationId = context.Options.TryGetValue("correlationId", out var cid)
            ? cid?.Trim()
            : null;

        var legacyLanguage = context.Options.TryGetValue("language", out var language)
            ? language
            : null;

        var runtimeLanguage = ToolRuntimeLanguageParser.ParseOrDefault(legacyLanguage);

        var requestContext = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["toolId"] = context.ToolId,
            ["action"] = context.Action
        };

        return new UniversalExecutionRequest(
            context.ToolId,
            context.Action,
            context.Input,
            runtimeLanguage,
            requestContext,
            string.IsNullOrWhiteSpace(correlationId) ? null : correlationId,
            context.Options);
    }
}
