using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ToolNexus.Application.Services;
using ToolNexus.Infrastructure.Options;

namespace ToolNexus.Infrastructure.Content;

public sealed class StartupOrchestratorHostedService(
    IEnumerable<IStartupPhaseService> startupPhaseServices,
    IOptions<StartupDiagnosticsOptions> diagnosticsOptions,
    ILogger<StartupOrchestratorHostedService> logger) : IHostedService
{
    private readonly IReadOnlyList<IStartupPhaseService> _orderedPhases = startupPhaseServices
        .OrderBy(service => service.Order)
        .ToArray();

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        foreach (var phase in _orderedPhases)
        {
            var stopwatch = System.Diagnostics.Stopwatch.StartNew();
            var beginMessage = $"[StartupPhase] BEGIN Phase {phase.Order} ({phase.PhaseName})";
            logger.LogInformation("{Message}", beginMessage);
            await WriteDiagnosticsLogAsync(beginMessage, cancellationToken);

            await phase.ExecuteAsync(cancellationToken);

            stopwatch.Stop();
            var endMessage = $"[StartupPhase] END Phase {phase.Order} ({phase.PhaseName}) DurationMs={stopwatch.ElapsedMilliseconds}";
            logger.LogInformation("{Message}", endMessage);
            await WriteDiagnosticsLogAsync(endMessage, cancellationToken);
        }
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    private async Task WriteDiagnosticsLogAsync(string message, CancellationToken cancellationToken)
    {
        var options = diagnosticsOptions.Value;
        if (!options.Enabled)
        {
            return;
        }

        var folder = string.IsNullOrWhiteSpace(options.LogFolder) ? "./logs/startup" : options.LogFolder;
        Directory.CreateDirectory(folder);

        var filePath = Path.Combine(folder, $"startup-diag-{DateTime.UtcNow:yyyyMMdd}.log");
        await File.AppendAllTextAsync(filePath, $"{DateTimeOffset.UtcNow:O} {message}{Environment.NewLine}", cancellationToken);
    }
}
