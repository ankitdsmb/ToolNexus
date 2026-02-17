using Microsoft.Extensions.DependencyInjection;

namespace ToolNexus.Application.Services.Pipeline;

public static class ToolExecutionPipelineServiceCollectionExtensions
{
    public static IServiceCollection AddToolExecutionPipeline(this IServiceCollection services)
    {
        services.AddScoped<IToolExecutionPipeline, ToolExecutionPipeline>();

        services.AddScoped<IApiToolExecutionStrategy, ApiToolExecutionStrategy>();
        services.AddScoped<IClientToolExecutionStrategy, NoOpClientExecutionStrategy>();

        // Default middleware order: validation → caching → client executor → API executor → post-processing.
        services.AddToolExecutionStep<ValidationExecutionStep>();
        services.AddToolExecutionStep<CachingExecutionStep>();
        services.AddToolExecutionStep<ClientExecutionStep>();
        services.AddToolExecutionStep<ApiExecutionStep>();
        services.AddToolExecutionStep<PostProcessingExecutionStep>();

        return services;
    }

    // Example extension point for custom middleware registration.
    public static IServiceCollection AddToolExecutionStep<TStep>(this IServiceCollection services)
        where TStep : class, IToolExecutionStep
    {
        services.AddScoped<IToolExecutionStep, TStep>();
        return services;
    }
}
