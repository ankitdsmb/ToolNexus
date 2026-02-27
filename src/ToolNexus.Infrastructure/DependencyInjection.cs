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
using ToolNexus.Infrastructure.HealthChecks;
using Microsoft.Extensions.Options;
using StackExchange.Redis;

namespace ToolNexus.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var provider = configuration["Database:Provider"];
        var connectionString = configuration["Database:ConnectionString"] ?? "Data Source=toolnexus.db";

        services.AddDbContext<ToolNexusContentDbContext>(options =>
            DatabaseProviderConfiguration.Configure(options, provider, connectionString));
        services.AddDbContextFactory<ToolNexusContentDbContext>(
            options => DatabaseProviderConfiguration.Configure(options, provider, connectionString),
            ServiceLifetime.Scoped);
        services.AddDbContext<ToolNexusIdentityDbContext>(options =>
            DatabaseProviderConfiguration.Configure(options, provider, connectionString));
        services.AddDbContextFactory<ToolNexusIdentityDbContext>(
            options => DatabaseProviderConfiguration.Configure(options, provider, connectionString),
            ServiceLifetime.Scoped);
        services
            .AddOptions<DatabaseInitializationOptions>()
            .Bind(configuration.GetSection(DatabaseInitializationOptions.SectionName));
        services
            .AddOptions<StartupDiagnosticsOptions>()
            .Bind(configuration.GetSection(StartupDiagnosticsOptions.SectionName));
        services.AddOptions<AuditGuardrailsOptions>().Bind(configuration.GetSection(AuditGuardrailsOptions.SectionName));

        services.AddSingleton<JsonFileToolManifestRepository>();
        services.AddSingleton<IToolManifestRepository, DbToolManifestRepository>();
        services.AddScoped<IToolDefinitionRepository, EfToolDefinitionRepository>();
        services.AddScoped<IToolContentRepository, EfToolContentRepository>();
        services.AddScoped<IToolContentEditorRepository, EfToolContentEditorRepository>();
        services.AddScoped<IAdminAuditLogRepository, EfAdminAuditLogRepository>();
        services.AddSingleton<AuditGuardrailsMetrics>();
        services.AddScoped<IAuditPayloadProcessor, AuditPayloadProcessor>();
        services.AddScoped<IAdminAuditLogger, AdminAuditLogger>();
        services.AddScoped<IAuditDeadLetterReplayService, AuditDeadLetterReplayService>();
        services.AddScoped<IAuditOutboxDestinationClient, NoopAuditOutboxDestinationClient>();
        services.AddScoped<IExecutionPolicyRepository, EfExecutionPolicyRepository>();
        services.AddScoped<IAdminExecutionMonitoringRepository, EfAdminExecutionMonitoringRepository>();
        services.AddScoped<IAutonomousInsightsRepository, EfAutonomousInsightsRepository>();
        services.AddScoped<IPlatformOptimizationRepository, EfPlatformOptimizationRepository>();
        services.AddScoped<IArchitectureEvolutionRepository, EfArchitectureEvolutionRepository>();
        services.AddScoped<IAdminControlPlaneRepository, EfAdminControlPlaneRepository>();
        services.AddScoped<IExecutionLedgerRepository, EfExecutionLedgerRepository>();
        services.AddScoped<IGovernanceDecisionRepository, EfGovernanceDecisionRepository>();
        services.AddScoped<IToolQualityScoreRepository, EfToolQualityScoreRepository>();
        services.AddScoped<ICapabilityMarketplaceRepository, EfCapabilityMarketplaceRepository>();
        services.AddScoped<IRuntimeIncidentRepository, EfRuntimeIncidentRepository>();
        services.AddScoped<IAiCapabilityFactoryRepository, EfAiCapabilityFactoryRepository>();
        services.AddScoped<IAiToolPackageRepository, EfAiToolPackageRepository>();
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
        services.AddSingleton<InMemoryBackgroundEventBus>();
        services.AddSingleton<IBackgroundEventBus>(sp =>
            new RedisBackgroundEventBus(
                sp.GetRequiredService<InMemoryBackgroundEventBus>(),
                sp.GetRequiredService<Microsoft.Extensions.Logging.ILogger<RedisBackgroundEventBus>>(),
                sp.GetService<IConnectionMultiplexer>()));
        services.AddSingleton<IPlatformCacheService, DistributedPlatformCacheService>();
        services.AddSingleton<IDistributedPlatformCache>(sp => sp.GetRequiredService<IPlatformCacheService>());
        services.AddSingleton<IToolExecutionRateGuard, InMemoryToolExecutionRateGuard>();
        var redisConnectionString = configuration.GetConnectionString("Redis") ?? configuration["REDIS_CONNECTION_STRING"];
        if (!string.IsNullOrWhiteSpace(redisConnectionString))
        {
            var redisOptions = ConfigurationOptions.Parse(redisConnectionString);
            redisOptions.AbortOnConnectFail = false;
            services.AddStackExchangeRedisCache(options => options.ConfigurationOptions = redisOptions);
            services.AddSingleton<IConnectionMultiplexer>(_ => ConnectionMultiplexer.Connect(redisOptions));
            services.AddSingleton<IDistributedWorkerLock, RedisWorkerLock>();
        }
        else
        {
            services.AddDistributedMemoryCache();
            services.AddSingleton<IDistributedWorkerLock, InMemoryWorkerLock>();
        }
        services.AddScoped<IToolResultCache, RedisToolResultCache>();
        services.AddSingleton<DatabaseInitializationState>();
        services.AddSingleton<IDatabaseInitializationState>(sp => sp.GetRequiredService<DatabaseInitializationState>());
        services.AddScoped<ToolContentSeedHostedService>();
        services.AddSingleton<IStartupPhaseService, DatabaseInitializationHostedService>();
        services.AddSingleton<IStartupPhaseService, ToolContentSeedStartupPhaseService>();
        services.AddSingleton<IStartupPhaseService, AdminIdentitySeedHostedService>();
        services.AddSingleton<IStartupPhaseService, ToolManifestSynchronizationHostedService>();
        services.AddSingleton<IStartupPhaseService, AdminIdentityStartupValidator>();
        services.AddHostedService<StartupOrchestratorHostedService>();
        services.AddSingleton<IToolInsightProvider, JsonInsightProvider>();
        services.AddSingleton<IToolInsightProvider, XmlInsightProvider>();
        services.AddSingleton<IToolInsightProvider, SqlInsightProvider>();
        services.AddSingleton<IToolInsightProvider, RegexInsightProvider>();
        services.AddSingleton<IToolInsightProvider, TextDiffInsightProvider>();
        services.AddSingleton<BackgroundWorkerHealthState>();
        services.AddSingleton<IConcurrencyObservability, ConcurrencyObservability>();
        services.AddSingleton<IBackgroundWorkQueue, BackgroundWorkQueue>();
        services.AddSingleton<ExecutionMetricsAggregator>();
        services.AddSingleton<ITelemetryEventProcessor, TelemetryEventProcessor>();
        services.AddSingleton<IToolExecutionEventService, ToolExecutionEventService>();
        services.AddHostedService<TelemetryBackgroundWorker>();
        services.AddHostedService<AuditOutboxWorker>();
        // Infrastructure owns concrete executor wiring.
        services.AddToolExecutors();
        return services;
    }
}
