using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public interface IToolContentRepository
{
    Task<ToolContent?> GetBySlugAsync(string slug, CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<string>> GetAllSlugsAsync(CancellationToken cancellationToken = default);
}
