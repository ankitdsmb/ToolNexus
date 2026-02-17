using System.Reflection;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using ToolNexus.Application.Abstractions;
using ToolNexus.Application.Options;
using ToolNexus.Application.Services;
using ToolNexus.Application.Services.Pipeline;

namespace ToolNexus.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services, IConfiguration configuration)
    {
        services
            .AddOptions<ToolResultCacheOptions>()
            .Bind(configuration.GetSection(ToolResultCacheOptions.SectionName))
            .Validate(x => x.MaxEntries > 0, "ToolResultCache:MaxEntries must be greater than zero.")
            .Validate(x => x.AbsoluteExpirationSeconds > 0, "ToolResultCache:AbsoluteExpirationSeconds must be greater than zero.")
            .Validate(x => !string.IsNullOrWhiteSpace(x.KeyPrefix), "ToolResultCache:KeyPrefix is required.")
            .ValidateOnStart();

        services.AddToolExecutionPipeline();
        services.AddScoped<IToolService, ToolService>();
        services.AddScoped<IOrchestrationService, OrchestrationService>();
        services.AddSingleton<IToolCatalogService, ToolCatalogService>();
        services.AddSingleton<ISitemapService, SitemapService>();
        return services;
    }

    public static IServiceCollection AddToolExecutorsFromLoadedAssemblies(this IServiceCollection services)
    {
        var executorTypes = AppDomain.CurrentDomain
            .GetAssemblies()
            .Where(assembly => !assembly.IsDynamic)
            .SelectMany(GetLoadableTypes)
            .Where(type => type is { IsAbstract: false, IsInterface: false } && typeof(IToolExecutor).IsAssignableFrom(type))
            .Distinct();

        foreach (var executorType in executorTypes)
        {
            services.AddScoped(typeof(IToolExecutor), executorType);
        }

        return services;
    }

    private static IEnumerable<Type> GetLoadableTypes(Assembly assembly)
    {
        try
        {
            return assembly.GetTypes();
        }
        catch (ReflectionTypeLoadException ex)
        {
            return ex.Types.Where(type => type is not null)!;
        }
    }
}
