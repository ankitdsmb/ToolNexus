using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public interface IRuntimeIncidentService
{
    Task IngestAsync(RuntimeIncidentIngestBatch batch, CancellationToken cancellationToken);
    Task<IReadOnlyList<RuntimeIncidentSummary>> GetLatestSummariesAsync(int take, CancellationToken cancellationToken);
}
