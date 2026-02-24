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
        await initializationState.WaitForReadyAsync(cancellationToken);

        using var scope = scopeFactory.CreateScope();
        var adminAnalyticsService = scope.ServiceProvider.GetRequiredService<IAdminAnalyticsService>();
        var toolCatalogService = scope.ServiceProvider.GetRequiredService<IToolCatalogService>();

        var dashboardTask = adminAnalyticsService.GetDashboardAsync(cancellationToken);
        var toolListTask = Task.Run(toolCatalogService.GetAllTools, cancellationToken);
        var categoriesTask = Task.Run(toolCatalogService.GetAllCategories, cancellationToken);

        await Task.WhenAll(dashboardTask, toolListTask, categoriesTask);
        logger.LogInformation("Platform cache warmup completed.");
    }
}
