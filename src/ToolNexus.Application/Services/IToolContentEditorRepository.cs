using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public interface IToolContentEditorRepository
{
    Task<ToolContentEditorGraph?> GetGraphByToolIdAsync(int toolId, CancellationToken cancellationToken = default);
    Task<bool> SaveGraphAsync(int toolId, SaveToolContentGraphRequest request, CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<string>> GetDefinitionSlugsAsync(CancellationToken cancellationToken = default);
}
