using Microsoft.Extensions.Diagnostics.HealthChecks;
using ToolNexus.Infrastructure.Content;

namespace ToolNexus.Infrastructure.HealthChecks;

public sealed class DatabaseInitializationHealthCheck(DatabaseInitializationState state) : IHealthCheck
{
    public Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        return Task.FromResult(state.Status switch
        {
            DatabaseInitializationStatus.Initializing => HealthCheckResult.Degraded("Database initialization is still running."),
            DatabaseInitializationStatus.Ready => HealthCheckResult.Healthy("Database initialization is complete."),
            DatabaseInitializationStatus.Failed => HealthCheckResult.Unhealthy("Database initialization failed.",
                exception: state.Error is null ? null : new InvalidOperationException(state.Error)),
            _ => HealthCheckResult.Unhealthy("Database initialization status is unknown.")
        });
    }
}
