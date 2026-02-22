using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public interface IToolDefinitionRepository
{
    Task<IReadOnlyCollection<ToolDefinitionListItem>> GetListAsync(CancellationToken cancellationToken = default);
    Task<ToolDefinitionDetail?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<bool> ExistsBySlugAsync(string slug, int? excludingId = null, CancellationToken cancellationToken = default);
    Task<ToolDefinitionDetail> CreateAsync(CreateToolDefinitionRequest request, CancellationToken cancellationToken = default);
    Task<ToolDefinitionDetail?> UpdateAsync(int id, UpdateToolDefinitionRequest request, CancellationToken cancellationToken = default);
    Task<bool> SetEnabledAsync(int id, bool enabled, CancellationToken cancellationToken = default);
}
