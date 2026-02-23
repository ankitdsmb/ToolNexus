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

        var normalizedRequest = Normalize(request);

        try
        {
            return await repository.SaveGraphAsync(toolId, normalizedRequest, cancellationToken);
        }
        catch (OptimisticConcurrencyException ex)
        {
            var server = await repository.GetGraphByToolIdAsync(toolId, cancellationToken);
            if (server is null)
            {
                return false;
            }

            throw new ConcurrencyConflictException(new ConcurrencyConflict(
                Error: "ConcurrencyConflict",
                Resource: "ToolContentGraph",
                ResourceId: toolId.ToString(),
                ClientVersionToken: ex.ClientVersionToken ?? normalizedRequest.VersionToken,
                ServerVersionToken: server.VersionToken,
                ServerState: server,
                ChangedFields: GetChangedFields(normalizedRequest, server),
                Message: "Resource was modified by another user. Refresh and reconcile changes."));
        }
    }

    private static SaveToolContentGraphRequest Normalize(SaveToolContentGraphRequest request)
        => new(
            request.Features.Select((x, i) => new ContentValueItem(x.Id, x.Value.Trim(), i)).ToArray(),
            request.Steps.Select((x, i) => new ContentStepItem(x.Id, x.Title.Trim(), x.Description.Trim(), i)).ToArray(),
            request.Examples.Select((x, i) => new ContentExampleItem(x.Id, x.Title.Trim(), x.Input.Trim(), x.Output.Trim(), i)).ToArray(),
            request.Faqs.Select((x, i) => new ContentFaqItem(x.Id, x.Question.Trim(), x.Answer.Trim(), i)).ToArray(),
            request.UseCases.Select((x, i) => new ContentValueItem(x.Id, x.Value.Trim(), i)).ToArray(),
            request.RelatedTools.Select((x, i) => new ContentRelatedItem(x.Id, x.RelatedSlug.Trim().ToLowerInvariant(), i)).ToArray(),
            request.VersionToken);

    private static IReadOnlyCollection<string> GetChangedFields(SaveToolContentGraphRequest request, ToolContentEditorGraph server)
    {
        var changed = new List<string>();
        if (!request.Features.SequenceEqual(server.Features)) changed.Add("features");
        if (!request.Steps.SequenceEqual(server.Steps)) changed.Add("steps");
        if (!request.Examples.SequenceEqual(server.Examples)) changed.Add("examples");
        if (!request.Faqs.SequenceEqual(server.Faqs)) changed.Add("faqs");
        if (!request.UseCases.SequenceEqual(server.UseCases)) changed.Add("useCases");
        if (!request.RelatedTools.SequenceEqual(server.RelatedTools)) changed.Add("relatedTools");
        return changed;
    }
}
