using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace ToolNexus.Api;

public sealed class HealthStateLoggingPublisher(ILogger<HealthStateLoggingPublisher> logger) : IHealthCheckPublisher
{
    private readonly Dictionary<string, HealthStatus> _lastStatuses = new(StringComparer.OrdinalIgnoreCase);

    public Task PublishAsync(HealthReport report, CancellationToken cancellationToken)
    {
        foreach (var (name, entry) in report.Entries)
        {
            if (_lastStatuses.TryGetValue(name, out var previous) && previous == entry.Status)
            {
                continue;
            }

            logger.LogInformation("Health state changed for {HealthCheckName}. Status: {HealthStatus}", name, entry.Status);
            _lastStatuses[name] = entry.Status;
        }

        return Task.CompletedTask;
    }
}
