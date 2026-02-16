using System.Reflection;
using Microsoft.Extensions.DependencyInjection;
using ToolNexus.Application.Services;
using ToolNexus.Domain;

namespace ToolNexus.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
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
