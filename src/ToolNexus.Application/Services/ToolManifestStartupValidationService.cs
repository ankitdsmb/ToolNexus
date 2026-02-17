using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace ToolNexus.Application.Services;

public sealed class ToolManifestStartupValidationService(IServiceProvider serviceProvider) : IHostedService
{
    public Task StartAsync(CancellationToken cancellationToken)
    {
        using var scope = serviceProvider.CreateScope();
        _ = scope.ServiceProvider.GetRequiredService<IToolManifestCatalog>().GetAll();
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
