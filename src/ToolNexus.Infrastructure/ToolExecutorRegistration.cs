using Microsoft.Extensions.DependencyInjection;
using ToolNexus.Application.Abstractions;
using ToolNexus.Infrastructure.Executors;

namespace ToolNexus.Infrastructure;

public static class ToolExecutorRegistration
{
    public static IServiceCollection AddToolExecutors(this IServiceCollection services)
    {
        // Explicit module registration to avoid broad reflection-based scanning.
        // Executors are stateless and reused by singleton startup validators.
        services.AddSingleton<IToolExecutor, Base64ToolExecutor>();
        services.AddSingleton<IToolExecutor, CsvToolExecutor>();
        services.AddSingleton<IToolExecutor, HtmlToolExecutor>();
        services.AddSingleton<IToolExecutor, JsonToolExecutor>();
        services.AddSingleton<IToolExecutor, JsonValidatorToolExecutor>();
        services.AddSingleton<IToolExecutor, MinifierToolExecutor>();
        services.AddSingleton<IToolExecutor, XmlToolExecutor>();

        return services;
    }
}
