using ToolNexus.Application.Models;

namespace ToolNexus.Api.Logging;

public interface IRuntimeClientLoggerService
{
    Task WriteBatchAsync(ClientIncidentLogBatch batch, CancellationToken cancellationToken);
}
