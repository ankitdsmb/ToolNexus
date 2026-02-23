using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using ToolNexus.Application.Abstractions;
using ToolNexus.Application.Services;
using ToolNexus.Application.Services.Policies;
using ToolNexus.Infrastructure.Caching;
using ToolNexus.Infrastructure.Content;
using ToolNexus.Infrastructure.Data;
using ToolNexus.Infrastructure.Options;
using ToolNexus.Infrastructure.Insights;
using ToolNexus.Infrastructure.Security;
using ToolNexus.Application.Services.Insights;
using ToolNexus.Infrastructure.Observability;

namespace ToolNexus.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var provider = configuration["Database:Provider"];
        var connectionString = configuration["Database:ConnectionString"] ?? "Data Source=toolnexus.db";

        services.AddDbContext<ToolNexusContentDbContext>(options =>
            DatabaseProviderConfiguration.Configure(options, provider, connectionString));

        services.AddSingleton<JsonFileToolManifestRepository>();
        services.AddSingleton<IToolManifestRepository, DbToolManifestRepository>();
        services.AddScoped<IToolDefinitionRepository, EfToolDefinitionRepository>();
        services.AddScoped<IToolContentRepository, EfToolContentRepository>();
        services.AddScoped<IToolContentEditorRepository, EfToolContentEditorRepository>();
        services.AddScoped<IAdminAuditLogRepository, EfAdminAuditLogRepository>();
        services.AddScoped<IAdminAuditLogger, AdminAuditLogger>();
        services.AddScoped<IExecutionPolicyRepository, EfExecutionPolicyRepository>();
        services.AddScoped<EfAdminAnalyticsRepository>();
        services.AddScoped<IAdminAnalyticsRepository>(sp =>
            new CachingAdminAnalyticsRepository(
                sp.GetRequiredService<EfAdminAnalyticsRepository>(),
                sp.GetRequiredService<IPlatformCacheService>(),
                sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<ToolNexus.Application.Options.PlatformCacheOptions>>()));
        services.AddScoped<IToolExecutionPolicyRegistry, ToolExecutionPolicyRegistry>();
        services
            .AddOptions<ApiKeyOptions>()
            .Bind(configuration.GetSection(ApiKeyOptions.SectionName))
            .ValidateOnStart();
        services.AddScoped<IApiKeyValidator, ApiKeyValidator>();
        services.AddMemoryCache();
        services.AddSingleton<IPlatformCacheService, InMemoryPlatformCacheService>();
        services.AddSingleton<IToolExecutionRateGuard, InMemoryToolExecutionRateGuard>();
        services.AddDistributedMemoryCache();
        services.AddScoped<IToolResultCache, RedisToolResultCache>();
        services.AddHostedService<ToolContentSeedHostedService>();
        services.AddSingleton<IToolInsightProvider, JsonInsightProvider>();
        services.AddSingleton<IToolInsightProvider, XmlInsightProvider>();
        services.AddSingleton<IToolInsightProvider, SqlInsightProvider>();
        services.AddSingleton<IToolInsightProvider, RegexInsightProvider>();
        services.AddSingleton<IToolInsightProvider, TextDiffInsightProvider>();
        services.AddSingleton<BackgroundWorkerHealthState>();
        services.AddSingleton<IBackgroundWorkQueue, BackgroundWorkQueue>();
        services.AddSingleton<ExecutionMetricsAggregator>();
        services.AddSingleton<ITelemetryEventProcessor, TelemetryEventProcessor>();
        services.AddSingleton<IToolExecutionEventService, ToolExecutionEventService>();
        services.AddHostedService<TelemetryBackgroundWorker>();
        // Infrastructure owns concrete executor wiring.
        services.AddToolExecutors();
        return services;
    }
}
