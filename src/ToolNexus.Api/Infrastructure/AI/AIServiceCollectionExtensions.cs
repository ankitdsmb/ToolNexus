namespace ToolNexus.Api.Infrastructure.AI;

public static class AIServiceCollectionExtensions
{
    public static IServiceCollection AddMiniLmInference(this IServiceCollection services)
    {
        services.AddSingleton<MiniLmInferenceEngine>();
        services.AddHostedService<MiniLmModelWarmupHostedService>();

        return services;
    }

    private sealed class MiniLmModelWarmupHostedService : IHostedService
    {
        private readonly MiniLmInferenceEngine _engine;
        private readonly ILogger<MiniLmModelWarmupHostedService> _logger;

        public MiniLmModelWarmupHostedService(
            MiniLmInferenceEngine engine,
            ILogger<MiniLmModelWarmupHostedService> logger)
        {
            _engine = engine;
            _logger = logger;
        }

        public Task StartAsync(CancellationToken cancellationToken)
        {
            _logger.LogInformation("MiniLM inference engine warmed up and ready.");
            _ = _engine;
            return Task.CompletedTask;
        }

        public Task StopAsync(CancellationToken cancellationToken)
        {
            _logger.LogInformation("MiniLM inference warmup hosted service stopping.");
            return Task.CompletedTask;
        }
    }
}
