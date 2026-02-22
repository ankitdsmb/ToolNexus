using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public interface IToolDefinitionService
{
    Task<IReadOnlyCollection<ToolDefinitionListItem>> GetListAsync(CancellationToken cancellationToken = default);
    Task<ToolDefinitionDetail?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<ToolDefinitionDetail> CreateAsync(CreateToolDefinitionRequest request, CancellationToken cancellationToken = default);
    Task<ToolDefinitionDetail?> UpdateAsync(int id, UpdateToolDefinitionRequest request, CancellationToken cancellationToken = default);
    Task<bool> SetEnabledAsync(int id, bool enabled, CancellationToken cancellationToken = default);
}
