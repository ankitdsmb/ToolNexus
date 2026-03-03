using Microsoft.Extensions.Hosting;

namespace ToolNexus.Web.Services.AI;

public static class AIEmbeddingExtensions
{
    public static IServiceCollection AddToolEmbeddingStore(this IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services);

        services.AddSingleton<ToolEmbeddingStore>();
        services.AddHostedService<ToolEmbeddingStoreWarmupHostedService>();
        return services;
    }

    private sealed class ToolEmbeddingStoreWarmupHostedService(ToolEmbeddingStore store) : IHostedService
    {
        public Task StartAsync(CancellationToken cancellationToken)
        {
            _ = store;
            return Task.CompletedTask;
        }

        public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
    }
}
