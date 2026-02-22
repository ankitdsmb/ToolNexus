using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using ToolNexus.Application.Options;
using ToolNexus.Application.Services;
using ToolNexus.Application.Services.Insights;
using ToolNexus.Application.Services.Pipeline;

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

        services.AddToolExecutionPipeline();
        services.AddHttpContextAccessor();
        services.AddScoped<IToolService, ToolService>();
        services.AddSingleton<IToolInsightService, ToolInsightService>();
        services.AddScoped<IOrchestrationService, OrchestrationService>();
        services.AddSingleton<IToolCatalogService, ToolCatalogService>();
        services.AddScoped<IToolDefinitionService, ToolDefinitionService>();
        services.AddScoped<ISitemapService, SitemapService>();
        services.AddSingleton<IToolManifestGovernance, ToolManifestGovernanceService>();
        services.AddScoped<IToolContentService, ToolContentService>();
        services.AddHostedService<ManifestStartupValidator>();
        services.AddHostedService<ManifestExecutorAlignmentValidator>();
        return services;
    }
}
