using ToolNexus.Web.Middleware;

namespace ToolNexus.Web.Security;

public static class SecurityServiceExtensions
{
    public static IServiceCollection AddToolSecurity(this IServiceCollection services)
    {
        services.AddSingleton<IBlockedIpService, BlockedIpService>();
        services.AddSingleton<IIpRateLimiter, IpRateLimiter>();
        services.AddSingleton<IDomainScanLimiter, DomainScanLimiter>();
        services.AddSingleton<IPrivateNetworkValidator, PrivateNetworkValidator>();

        return services;
    }

    public static IApplicationBuilder UseToolSecurity(this IApplicationBuilder app)
    {
        return app.UseMiddleware<ToolSecurityMiddleware>();
    }
}
