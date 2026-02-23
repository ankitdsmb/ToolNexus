using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public interface IRuntimeIncidentRepository
{
    Task UpsertAsync(RuntimeIncidentIngestRequest incident, CancellationToken cancellationToken);
    Task<IReadOnlyList<RuntimeIncidentSummary>> GetLatestSummariesAsync(int take, CancellationToken cancellationToken);
    Task<IReadOnlyList<RuntimeToolHealthSnapshot>> GetToolHealthAsync(CancellationToken cancellationToken);
}
