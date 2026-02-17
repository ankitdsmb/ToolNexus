using System.Reflection;
using Microsoft.Extensions.DependencyInjection;
using ToolNexus.Application.Abstractions;
using ToolNexus.Application.Services;
using ToolNexus.Application.Services.Policies;
using ToolNexus.Infrastructure.Content;

namespace ToolNexus.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services)
    {
        services.AddSingleton<IToolManifestRepository, JsonFileToolManifestRepository>();
        services.AddSingleton<IToolExecutionPolicyRegistry, ToolExecutionPolicyRegistry>();
        services.AddToolExecutorsFromLoadedAssemblies();
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
