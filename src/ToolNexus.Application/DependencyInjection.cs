using Microsoft.Extensions.DependencyInjection;
using ToolNexus.Application.Services;

namespace ToolNexus.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<IToolService, ToolService>();
        return services;
    }
}
