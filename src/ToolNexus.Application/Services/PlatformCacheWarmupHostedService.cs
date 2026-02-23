using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace ToolNexus.Application.Services;

public sealed class PlatformCacheWarmupHostedService(
    IServiceScopeFactory scopeFactory,
    ILogger<PlatformCacheWarmupHostedService> logger) : IHostedService
{
    public async Task StartAsync(CancellationToken cancellationToken)
    {
        try
        {
            using var scope = scopeFactory.CreateScope();
            var adminAnalyticsService = scope.ServiceProvider.GetRequiredService<IAdminAnalyticsService>();
            var toolCatalogService = scope.ServiceProvider.GetRequiredService<IToolCatalogService>();

            var dashboardTask = adminAnalyticsService.GetDashboardAsync(cancellationToken);
            var toolListTask = Task.Run(toolCatalogService.GetAllTools, cancellationToken);
            var categoriesTask = Task.Run(toolCatalogService.GetAllCategories, cancellationToken);

            await Task.WhenAll(dashboardTask, toolListTask, categoriesTask);
            logger.LogInformation("Platform cache warmup completed.");
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Platform cache warmup failed; application startup will continue.");
        }
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
