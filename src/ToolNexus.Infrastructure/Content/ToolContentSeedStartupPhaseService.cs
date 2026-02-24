using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ToolNexus.Application.Services;
using ToolNexus.Infrastructure.Options;

namespace ToolNexus.Infrastructure.Content;

public sealed class ToolContentSeedStartupPhaseService(
    IServiceProvider serviceProvider,
    IOptions<DatabaseInitializationOptions> options,
    IDatabaseInitializationState initializationState,
    ILogger<ToolContentSeedStartupPhaseService> logger) : IStartupPhaseService
{
    public int Order => 1;

    public string PhaseName => "Tool Content Seeding";

    public async Task ExecuteAsync(CancellationToken cancellationToken)
    {
        await initializationState.WaitForReadyAsync(cancellationToken);

        using var scope = serviceProvider.CreateScope();
        var initializer = scope.ServiceProvider.GetRequiredService<ToolContentSeedHostedService>();
        await initializer.InitializeAsync(
            runMigration: false,
            runSeed: options.Value.RunSeedOnStartup,
            cancellationToken);

        logger.LogInformation("Tool content seed phase completed. Seed enabled: {RunSeed}.", options.Value.RunSeedOnStartup);
    }
}
