using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace ToolNexus.Infrastructure.Observability;

public sealed class TelemetryBackgroundWorker(
    IBackgroundWorkQueue backgroundWorkQueue,
    BackgroundWorkerHealthState healthState,
    ToolNexus.Application.Services.IDatabaseInitializationState initializationState,
    IDistributedWorkerLock workerLock,
    ILogger<TelemetryBackgroundWorker> logger) : BackgroundService
{
    private static readonly TimeSpan LockTtl = TimeSpan.FromMinutes(5);
    private const string AggregatorLockName = "toolnexus:lock:telemetry-aggregator";

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("Telemetry background worker waiting for database initialization readiness.");
        await initializationState.WaitForReadyAsync(stoppingToken);
        logger.LogInformation("Telemetry background worker detected database readiness and is starting.");

        while (!stoppingToken.IsCancellationRequested)
        {
            await using var leaderLease = await workerLock.TryAcquireAsync(AggregatorLockName, LockTtl, stoppingToken);
            if (leaderLease is null)
            {
                healthState.SetWorkerActive(false);
                await Task.Delay(TimeSpan.FromSeconds(2), stoppingToken);
                continue;
            }

            healthState.SetWorkerActive(true);
            try
            {
                while (!stoppingToken.IsCancellationRequested)
                {
                    try
                    {
                        await foreach (var workItem in backgroundWorkQueue.DequeueAllAsync(stoppingToken))
                        {
                            await ExecuteSafelyAsync(workItem, stoppingToken);
                        }
                    }
                    catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                    {
                        break;
                    }
                    catch (Exception ex)
                    {
                        logger.LogError(ex, "Background worker loop failure. Worker will continue.");
                        await Task.Delay(TimeSpan.FromMilliseconds(200), stoppingToken);
                    }
                }
            }
            finally
            {
                healthState.SetWorkerActive(false);
            }
        }
    }

    private async Task ExecuteSafelyAsync(Func<CancellationToken, ValueTask> workItem, CancellationToken stoppingToken)
    {
        Exception? lastError = null;

        for (var attempt = 1; attempt <= 2; attempt++)
        {
            try
            {
                await workItem(stoppingToken);
                healthState.MarkProcessed(DateTime.UtcNow);
                return;
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception ex)
            {
                lastError = ex;
                logger.LogError(ex, "Background telemetry work item failed on attempt {Attempt}.", attempt);
            }
        }

        logger.LogError(lastError, "Background telemetry work item permanently failed after retry.");
    }
}
