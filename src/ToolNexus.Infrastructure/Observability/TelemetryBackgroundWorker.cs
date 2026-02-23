using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace ToolNexus.Infrastructure.Observability;

public sealed class TelemetryBackgroundWorker(
    IBackgroundWorkQueue backgroundWorkQueue,
    ILogger<TelemetryBackgroundWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var workItem in backgroundWorkQueue.DequeueAllAsync(stoppingToken))
        {
            try
            {
                await workItem(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Background telemetry work item failed.");
            }
        }
    }
}
