using System.Text.Json;
using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public sealed class AiToolGeneratorService(IAiToolGeneratorRepository repository) : IAiToolGeneratorService
{
    public async Task<AiGeneratedToolRecord> GenerateToolDraftAsync(AiToolGenerationRequest request, CancellationToken cancellationToken)
    {
        var trimmedPrompt = request.Prompt.Trim();
        var slug = GenerateSlug(trimmedPrompt);

        var schema = JsonSerializer.Serialize(new
        {
            type = "object",
            properties = new
            {
                input = new
                {
                    type = "string",
                    description = trimmedPrompt
                }
            },
            required = new[] { "input" }
        });

        var manifest = JsonSerializer.Serialize(new
        {
            name = slug,
            description = trimmedPrompt,
            requiresReview = true,
            activation = "manual-approval"
        });

        return await repository.CreateDraftAsync(trimmedPrompt, schema, manifest, cancellationToken);
    }

    private static string GenerateSlug(string prompt)
    {
        var chars = prompt
            .ToLowerInvariant()
            .Where(c => char.IsLetterOrDigit(c) || char.IsWhiteSpace(c))
            .ToArray();

        var baseSlug = string.Join('-', new string(chars).Split(' ', StringSplitOptions.RemoveEmptyEntries));
        return string.IsNullOrWhiteSpace(baseSlug) ? "ai-generated-tool" : baseSlug;
    }
}
