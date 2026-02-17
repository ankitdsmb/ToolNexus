using Microsoft.Extensions.Options;
using ToolNexus.Api.Options;

namespace ToolNexus.Api.Middleware;

public sealed class SecurityHeadersMiddleware(
    RequestDelegate next,
    IOptions<SecurityHeadersOptions> options,
    IHostEnvironment environment)
{
    private readonly SecurityHeadersOptions _options = options.Value;
    private readonly bool _useCspReportOnly = environment.IsDevelopment() && options.Value.EnableCspReportOnlyInDevelopment;
    private readonly string _cspValue = ContentSecurityPolicyBuilder.Build(options.Value);

    public Task InvokeAsync(HttpContext context)
    {
        context.Response.OnStarting(static state =>
        {
            var (httpContext, middleware) = ((HttpContext, SecurityHeadersMiddleware))state;
            var headers = httpContext.Response.Headers;

            if (!headers.ContainsKey("X-Frame-Options"))
            {
                headers.Append("X-Frame-Options", middleware._options.XFrameOptions);
            }

            if (!headers.ContainsKey("X-Content-Type-Options"))
            {
                headers.Append("X-Content-Type-Options", middleware._options.XContentTypeOptions);
            }

            if (!headers.ContainsKey("Referrer-Policy"))
            {
                headers.Append("Referrer-Policy", middleware._options.ReferrerPolicy);
            }

            if (!headers.ContainsKey("Permissions-Policy"))
            {
                headers.Append("Permissions-Policy", middleware._options.PermissionsPolicy);
            }

            if (middleware._options.EnableContentSecurityPolicy)
            {
                var cspHeaderName = middleware._useCspReportOnly
                    ? "Content-Security-Policy-Report-Only"
                    : "Content-Security-Policy";

                if (!headers.ContainsKey(cspHeaderName))
                {
                    headers.Append(cspHeaderName, middleware._cspValue);
                }
            }

            return Task.CompletedTask;
        }, (context, this));

        return next(context);
    }
}
