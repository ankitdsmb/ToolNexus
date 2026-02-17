using Microsoft.Extensions.DependencyInjection;
using ToolNexus.Application.Services;
using ToolNexus.Infrastructure.Content;

namespace ToolNexus.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services)
    {
        services.AddSingleton<IToolManifestRepository, JsonFileToolManifestRepository>();
        return services;
    }
}
