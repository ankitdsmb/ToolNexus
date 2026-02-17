using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public sealed class ToolContentService(IToolContentRepository repository) : IToolContentService
{
    public Task<ToolContent?> GetBySlugAsync(string slug, CancellationToken cancellationToken = default) =>
        repository.GetBySlugAsync(slug, cancellationToken);

    public Task<IReadOnlyCollection<string>> GetAllSlugsAsync(CancellationToken cancellationToken = default) =>
        repository.GetAllSlugsAsync(cancellationToken);
}
