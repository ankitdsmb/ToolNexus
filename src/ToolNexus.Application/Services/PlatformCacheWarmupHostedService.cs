using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace ToolNexus.Application.Services;

public sealed class PlatformCacheWarmupHostedService(
    IServiceScopeFactory scopeFactory,
    IDatabaseInitializationState initializationState,
    ILogger<PlatformCacheWarmupHostedService> logger) : IStartupPhaseService
{
    public int Order => 3;

    public string PhaseName => "Platform Cache Warmup";

    public async Task ExecuteAsync(CancellationToken cancellationToken)
    {
        try
        {
            await initializationState.WaitForReadyAsync(cancellationToken);
        }
        catch (InvalidOperationException ex)
        {
            logger.LogWarning(ex, "Skipping platform cache warmup because database initialization did not reach ready state.");
            return;
        }

        logger.LogInformation("Platform cache warmup started after database readiness signal.");

        using var scope = scopeFactory.CreateScope();
        var adminAnalyticsService = scope.ServiceProvider.GetRequiredService<IAdminAnalyticsService>();
        var toolCatalogService = scope.ServiceProvider.GetRequiredService<IToolCatalogService>();

        _ = await adminAnalyticsService.GetDashboardAsync(cancellationToken);
        _ = toolCatalogService.GetAllTools();
        _ = toolCatalogService.GetAllCategories();
        logger.LogInformation("Platform cache warmup completed.");
    }
}
