using Microsoft.Extensions.DependencyInjection;
using ToolNexus.Application.Services.Pipeline.Steps;

namespace ToolNexus.Application.Services.Pipeline;

public static class ToolExecutionPipelineServiceCollectionExtensions
{
    public static IServiceCollection AddToolExecutionPipeline(this IServiceCollection services)
    {
        services.AddScoped<IToolExecutionPipeline, ToolExecutionPipeline>();
        services.AddSingleton<IToolConcurrencyLimiter, InMemoryToolConcurrencyLimiter>();
        services.AddSingleton<ToolExecutionMetrics>();
        services.AddSingleton<IToolExecutionResiliencePipelineProvider, ToolExecutionResiliencePipelineProvider>();

        services.AddScoped<IApiToolExecutionStrategy, ApiToolExecutionStrategy>();
        services.AddScoped<IClientToolExecutionStrategy, NoOpClientExecutionStrategy>();
        services.AddScoped<IExecutionAuthorityResolver, DefaultExecutionAuthorityResolver>();
        services.AddScoped<IUniversalExecutionEngine, UniversalExecutionEngine>();
        services.AddScoped<UniversalExecutionRequestMapper>();
        services.AddScoped<IWorkerRuntimeManager, NoOpWorkerRuntimeManager>();
        services.AddScoped<IWorkerPoolCoordinator, NoOpWorkerPoolCoordinator>();
        services.AddScoped<WorkerExecutionOrchestrator>();
        services.AddScoped<ILanguageExecutionAdapter, DotNetExecutionAdapter>();
        services.AddScoped<ILanguageExecutionAdapter, PythonExecutionAdapter>();

        services.AddToolExecutionStep<ValidationStep>();
        services.AddToolExecutionStep<PolicyEnforcementStep>();
        services.AddToolExecutionStep<RateLimitStep>();
        services.AddToolExecutionStep<CachingExecutionStep>();
        services.AddToolExecutionStep<ExecutionStep>();
        services.AddToolExecutionStep<ExecutionTelemetryStep>();
        services.AddToolExecutionStep<MetricsStep>();

        return services;
    }

    public static IServiceCollection AddToolExecutionStep<TStep>(this IServiceCollection services)
        where TStep : class, IToolExecutionStep
    {
        services.AddScoped<IToolExecutionStep, TStep>();
        return services;
    }
}
