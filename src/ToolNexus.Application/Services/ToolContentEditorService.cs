using System.ComponentModel.DataAnnotations;
using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public sealed class ToolContentEditorService(IToolContentEditorRepository repository) : IToolContentEditorService
{
    public Task<ToolContentEditorGraph?> GetGraphByToolIdAsync(int toolId, CancellationToken cancellationToken = default)
        => repository.GetGraphByToolIdAsync(toolId, cancellationToken);

    public async Task<bool> SaveGraphAsync(int toolId, SaveToolContentGraphRequest request, CancellationToken cancellationToken = default)
    {
        var validRelatedSlugs = await repository.GetDefinitionSlugsAsync(cancellationToken);
        var validSet = new HashSet<string>(validRelatedSlugs, StringComparer.OrdinalIgnoreCase);

        foreach (var related in request.RelatedTools)
        {
            if (!validSet.Contains(related.RelatedSlug.Trim()))
            {
                throw new ValidationException($"Related tool slug '{related.RelatedSlug}' does not exist.");
            }
        }

        return await repository.SaveGraphAsync(toolId, Normalize(request), cancellationToken);
    }

    private static SaveToolContentGraphRequest Normalize(SaveToolContentGraphRequest request)
        => new(
            request.Features.Select((x, i) => new ContentValueItem(x.Id, x.Value.Trim(), i)).ToArray(),
            request.Steps.Select((x, i) => new ContentStepItem(x.Id, x.Title.Trim(), x.Description.Trim(), i)).ToArray(),
            request.Examples.Select((x, i) => new ContentExampleItem(x.Id, x.Title.Trim(), x.Input.Trim(), x.Output.Trim(), i)).ToArray(),
            request.Faqs.Select((x, i) => new ContentFaqItem(x.Id, x.Question.Trim(), x.Answer.Trim(), i)).ToArray(),
            request.UseCases.Select((x, i) => new ContentValueItem(x.Id, x.Value.Trim(), i)).ToArray(),
            request.RelatedTools.Select((x, i) => new ContentRelatedItem(x.Id, x.RelatedSlug.Trim().ToLowerInvariant(), i)).ToArray());
}
