using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using ToolNexus.Application.Options;
using ToolNexus.Application.Services;
using ToolNexus.Application.Services.Insights;
using ToolNexus.Application.Services.Pipeline;
using Microsoft.Extensions.Options;

namespace ToolNexus.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services, IConfiguration configuration)
    {
        services
            .AddOptions<ToolResultCacheOptions>()
            .Bind(configuration.GetSection(ToolResultCacheOptions.SectionName))
            .Validate(x => x.MaxEntries > 0, "ToolResultCache:MaxEntries must be greater than zero.")
            .Validate(x => x.AbsoluteExpirationSeconds > 0, "ToolResultCache:AbsoluteExpirationSeconds must be greater than zero.")
            .Validate(x => !string.IsNullOrWhiteSpace(x.KeyPrefix), "ToolResultCache:KeyPrefix is required.")
            .ValidateOnStart();

        services
            .AddOptions<ToolExecutionPolicyOptions>()
            .Bind(configuration.GetSection(ToolExecutionPolicyOptions.SectionName))
            .ValidateOnStart();

        services
            .AddOptions<PlatformCacheOptions>()
            .Bind(configuration.GetSection(PlatformCacheOptions.SectionName))
            .Validate(x => x.ToolMetadataTtlSeconds > 0, "PlatformCache:ToolMetadataTtlSeconds must be greater than zero.")
            .Validate(x => x.ExecutionPoliciesTtlSeconds > 0, "PlatformCache:ExecutionPoliciesTtlSeconds must be greater than zero.")
            .Validate(x => x.AnalyticsDashboardTtlSeconds > 0, "PlatformCache:AnalyticsDashboardTtlSeconds must be greater than zero.")
            .Validate(x => x.DailyMetricsSnapshotsTtlSeconds > 0, "PlatformCache:DailyMetricsSnapshotsTtlSeconds must be greater than zero.")
            .ValidateOnStart();

        services.AddToolExecutionPipeline();
        services.AddHttpContextAccessor();
        services.AddSingleton<IToolExecutionEventService, NoOpToolExecutionEventService>();
        services.AddScoped<IToolService, ToolService>();
        services.AddSingleton<IToolInsightService, ToolInsightService>();
        services.AddScoped<IOrchestrationService, OrchestrationService>();
        services.AddSingleton<IToolCatalogService, ToolCatalogService>();
        services.AddScoped<ToolDefinitionService>();
        services.AddScoped<IToolDefinitionService>(sp =>
            new CachingToolDefinitionService(
                sp.GetRequiredService<ToolDefinitionService>(),
                sp.GetRequiredService<IPlatformCacheService>(),
                sp.GetRequiredService<IOptions<PlatformCacheOptions>>()));
        services.AddScoped<ISitemapService, SitemapService>();
        services.AddSingleton<IToolManifestGovernance, ToolManifestGovernanceService>();
        services.AddScoped<IToolContentService, ToolContentService>();
        services.AddScoped<IToolContentEditorService, ToolContentEditorService>();
        services.AddScoped<IAdminAuditLogService, AdminAuditLogService>();
        services.AddScoped<ExecutionPolicyService>();
        services.AddScoped<IExecutionPolicyService>(sp =>
            new CachingExecutionPolicyService(
                sp.GetRequiredService<ExecutionPolicyService>(),
                sp.GetRequiredService<IPlatformCacheService>(),
                sp.GetRequiredService<IOptions<PlatformCacheOptions>>()));
        services.AddScoped<IToolIntelligenceService, ToolIntelligenceService>();
        services.AddScoped<AdminAnalyticsService>();
        services.AddScoped<IAdminAnalyticsService>(sp =>
            new CachingAdminAnalyticsService(
                sp.GetRequiredService<AdminAnalyticsService>(),
                sp.GetRequiredService<IPlatformCacheService>(),
                sp.GetRequiredService<IOptions<PlatformCacheOptions>>()));
        services.AddHostedService<ManifestStartupValidator>();
        services.AddHostedService<ManifestExecutorAlignmentValidator>();
        return services;
    }
}
