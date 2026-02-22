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
        return await repository.UpdateAsync(id, Normalize(request), cancellationToken);
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
}
