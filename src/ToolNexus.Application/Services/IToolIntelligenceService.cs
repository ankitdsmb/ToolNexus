using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public interface IToolIntelligenceService
{
    Task<IReadOnlyList<ToolAnomalySnapshot>> DetectAndPersistDailyAnomaliesAsync(DateOnly date, CancellationToken cancellationToken);
}
