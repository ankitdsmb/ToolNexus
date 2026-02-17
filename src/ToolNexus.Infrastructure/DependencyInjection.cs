using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using ToolNexus.Application.Abstractions;
using ToolNexus.Application.Services;
using ToolNexus.Application.Services.Policies;
using ToolNexus.Infrastructure.Caching;
using ToolNexus.Infrastructure.Content;
using ToolNexus.Infrastructure.Data;

namespace ToolNexus.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var provider = configuration["Database:Provider"] ?? "Sqlite";
        var connectionString = configuration["Database:ConnectionString"] ?? "Data Source=toolnexus.db";

        if (provider.Equals("Sqlite", StringComparison.OrdinalIgnoreCase))
        {
            services.AddDbContext<ToolNexusContentDbContext>(options => options.UseSqlite(connectionString));
        }

        services.AddSingleton<IToolManifestRepository, JsonFileToolManifestRepository>();
        services.AddScoped<IToolContentRepository, EfToolContentRepository>();
        services.AddScoped<IToolContentService, ToolContentService>();
        services.AddSingleton<IToolExecutionPolicyRegistry, ToolExecutionPolicyRegistry>();
        services.AddMemoryCache();
        services.AddDistributedMemoryCache();
        services.AddScoped<IToolResultCache, RedisToolResultCache>();
        services.AddHostedService<ToolContentSeedHostedService>();
        // Infrastructure owns concrete executor wiring.
        services.AddToolExecutors();
        return services;
    }
}
