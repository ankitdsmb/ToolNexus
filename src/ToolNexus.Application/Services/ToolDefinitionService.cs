using System.ComponentModel.DataAnnotations;
using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public sealed class ToolDefinitionService(IToolDefinitionRepository repository) : IToolDefinitionService
{
    public Task<IReadOnlyCollection<ToolDefinitionListItem>> GetListAsync(CancellationToken cancellationToken = default)
        => repository.GetListAsync(cancellationToken);

    public Task<ToolDefinitionDetail?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
        => repository.GetByIdAsync(id, cancellationToken);

    public async Task<ToolDefinitionDetail> CreateAsync(CreateToolDefinitionRequest request, CancellationToken cancellationToken = default)
    {
        await ValidateAndThrowAsync(request.Slug, null, cancellationToken);
        return await repository.CreateAsync(Normalize(request), cancellationToken);
    }

    public async Task<ToolDefinitionDetail?> UpdateAsync(int id, UpdateToolDefinitionRequest request, CancellationToken cancellationToken = default)
    {
        await ValidateAndThrowAsync(request.Slug, id, cancellationToken);
        var normalizedRequest = Normalize(request);

        try
        {
            return await repository.UpdateAsync(id, normalizedRequest, cancellationToken);
        }
        catch (OptimisticConcurrencyException ex)
        {
            var server = await repository.GetByIdAsync(id, cancellationToken);
            if (server is null)
            {
                return null;
            }

            throw new ConcurrencyConflictException(new ConcurrencyConflict(
                Error: "ConcurrencyConflict",
                Resource: "ToolDefinition",
                ResourceId: id.ToString(),
                ClientVersionToken: ex.ClientVersionToken ?? normalizedRequest.VersionToken,
                ServerVersionToken: server.VersionToken,
                ServerState: server,
                ChangedFields: GetChangedFields(normalizedRequest, server),
                Message: "Resource was modified by another user. Refresh and reconcile changes."));
        }
    }

    public Task<bool> SetEnabledAsync(int id, bool enabled, CancellationToken cancellationToken = default)
        => repository.SetEnabledAsync(id, enabled, cancellationToken);

    private async Task ValidateAndThrowAsync(string slug, int? excludingId, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(slug))
        {
            throw new ValidationException("Slug is required.");
        }

        if (await repository.ExistsBySlugAsync(slug.Trim(), excludingId, cancellationToken))
        {
            throw new ValidationException($"Tool slug '{slug}' already exists.");
        }
    }

    private static CreateToolDefinitionRequest Normalize(CreateToolDefinitionRequest request)
        => request with
        {
            Name = request.Name.Trim(),
            Slug = request.Slug.Trim().ToLowerInvariant(),
            Description = request.Description.Trim(),
            Category = request.Category.Trim(),
            Status = NormalizeStatus(request.Status),
            Icon = request.Icon.Trim(),
            InputSchema = request.InputSchema.Trim(),
            OutputSchema = request.OutputSchema.Trim()
        };

    private static UpdateToolDefinitionRequest Normalize(UpdateToolDefinitionRequest request)
        => request with
        {
            Name = request.Name.Trim(),
            Slug = request.Slug.Trim().ToLowerInvariant(),
            Description = request.Description.Trim(),
            Category = request.Category.Trim(),
            Status = NormalizeStatus(request.Status),
            Icon = request.Icon.Trim(),
            InputSchema = request.InputSchema.Trim(),
            OutputSchema = request.OutputSchema.Trim()
        };

    private static string NormalizeStatus(string status)
        => status.Equals("disabled", StringComparison.OrdinalIgnoreCase) ? "Disabled" : "Enabled";

    private static IReadOnlyCollection<string> GetChangedFields(UpdateToolDefinitionRequest request, ToolDefinitionDetail server)
    {
        var changed = new List<string>();
        if (!string.Equals(request.Name, server.Name, StringComparison.Ordinal)) changed.Add("name");
        if (!string.Equals(request.Slug, server.Slug, StringComparison.Ordinal)) changed.Add("slug");
        if (!string.Equals(request.Description, server.Description, StringComparison.Ordinal)) changed.Add("description");
        if (!string.Equals(request.Category, server.Category, StringComparison.Ordinal)) changed.Add("category");
        if (!string.Equals(request.Status, server.Status, StringComparison.Ordinal)) changed.Add("status");
        if (!string.Equals(request.Icon, server.Icon, StringComparison.Ordinal)) changed.Add("icon");
        if (request.SortOrder != server.SortOrder) changed.Add("sortOrder");
        if (!string.Equals(request.InputSchema, server.InputSchema, StringComparison.Ordinal)) changed.Add("inputSchema");
        if (!string.Equals(request.OutputSchema, server.OutputSchema, StringComparison.Ordinal)) changed.Add("outputSchema");
        return changed;
    }
}
