using ToolNexus.Application.Contracts;

namespace ToolNexus.Application.Services;

public interface IToolContentService
{
    Task<ToolContentDto?> GetBySlugAsync(string slug, CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<string>> GetAllSlugsAsync(CancellationToken cancellationToken = default);
}
