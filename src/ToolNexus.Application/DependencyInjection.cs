using System.Reflection;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using ToolNexus.Application.Options;
using ToolNexus.Application.Services;
using ToolNexus.Domain;

namespace ToolNexus.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services, IConfiguration configuration)
    {
        services
            .AddOptions<ToolResultCacheOptions>()
            .Bind(configuration.GetSection(ToolResultCacheOptions.SectionName))
            .Validate(x => x.MaxEntries > 0, "ToolResultCache:MaxEntries must be greater than zero.")
            .ValidateOnStart();

        var configuredMaxEntries = configuration
            .GetSection(ToolResultCacheOptions.SectionName)
            .GetValue<int?>(nameof(ToolResultCacheOptions.MaxEntries));

        services.AddMemoryCache(options =>
        {
            if (configuredMaxEntries is > 0)
            {
                options.SizeLimit = configuredMaxEntries;
            }
        });

        services.AddScoped<IToolService, ToolService>();
        return services;
    }

    public static IServiceCollection AddToolExecutorsFromAssembly(
        this IServiceCollection services,
        Assembly assembly)
    {
        var executorTypes = assembly
            .GetTypes()
            .Where(type => type is { IsAbstract: false, IsInterface: false } && typeof(IToolExecutor).IsAssignableFrom(type));

        foreach (var executorType in executorTypes)
        {
            services.AddScoped(typeof(IToolExecutor), executorType);
        }

        return services;
    }
}
