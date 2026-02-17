using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using ToolNexus.Application.Services;
using ToolNexus.Infrastructure.Options;
using ToolNexus.Infrastructure.Security;

namespace ToolNexus.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services
            .AddOptions<ApiKeyOptions>()
            .Bind(configuration.GetSection(ApiKeyOptions.SectionName))
            .Validate(x => !x.Enabled || x.Keys.Count > 0, "At least one API key must be configured when API key validation is enabled.")
            .ValidateOnStart();

        services.AddSingleton<IApiKeyValidator, ApiKeyValidator>();
        return services;
    }
}
