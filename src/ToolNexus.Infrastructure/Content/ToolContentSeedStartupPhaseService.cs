using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ToolNexus.Application.Services;
using ToolNexus.Infrastructure.Data;
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

        var runSeed = options.Value.RunSeedOnStartup;
        if (!runSeed)
        {
            runSeed = await ShouldRunFallbackSeedAsync(cancellationToken);
            if (runSeed)
            {
                logger.LogWarning("[ToolEndpointRegistration] Database seed is disabled by configuration, but the platform content store is empty. Running fallback tool seed.");
            }
        }

        using var scope = serviceProvider.CreateScope();
        var initializer = scope.ServiceProvider.GetRequiredService<ToolContentSeedHostedService>();
        await initializer.InitializeAsync(
            runMigration: false,
            runSeed: runSeed,
            cancellationToken);

        logger.LogInformation("Tool content seed phase completed. Seed enabled: {RunSeed}.", runSeed);
    }

    private async Task<bool> ShouldRunFallbackSeedAsync(CancellationToken cancellationToken)
    {
        using var scope = serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ToolNexusContentDbContext>();

        try
        {
            var hasDefinitions = await dbContext.ToolDefinitions.AsNoTracking().AnyAsync(cancellationToken);
            var hasContent = await dbContext.ToolContents.AsNoTracking().AnyAsync(cancellationToken);
            return !hasDefinitions && !hasContent;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Unable to inspect content tables for fallback seed decision.");
            return false;
        }
    }
}
