using Microsoft.Extensions.DependencyInjection;
using ToolNexus.Application.Abstractions;
using ToolNexus.Infrastructure.Executors;

namespace ToolNexus.Infrastructure;

public static class ToolExecutorRegistration
{
    public static IServiceCollection AddToolExecutors(this IServiceCollection services)
    {
        // Explicit module registration to avoid broad reflection-based scanning.
        services.AddScoped<IToolExecutor, Base64ToolExecutor>();
        services.AddScoped<IToolExecutor, CsvToolExecutor>();
        services.AddScoped<IToolExecutor, HtmlToolExecutor>();
        services.AddScoped<IToolExecutor, JsonToolExecutor>();
        services.AddScoped<IToolExecutor, JsonValidatorToolExecutor>();
        services.AddScoped<IToolExecutor, MinifierToolExecutor>();
        services.AddScoped<IToolExecutor, XmlToolExecutor>();

        return services;
    }
}
