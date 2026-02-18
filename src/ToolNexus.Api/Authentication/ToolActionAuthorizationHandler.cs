using Microsoft.AspNetCore.Authorization;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;

namespace ToolNexus.Api.Authentication;

public sealed class ToolActionAuthorizationHandler(
    IToolManifestGovernance manifestGovernance,
    ILogger<ToolActionAuthorizationHandler> logger) : AuthorizationHandler<ToolActionRequirement>
{
    private const string SecurityLevelClaimType = "tool_security_level";

    protected override Task HandleRequirementAsync(AuthorizationHandlerContext context, ToolActionRequirement requirement)
    {
        if (context.Resource is not HttpContext httpContext)
        {
            return Task.CompletedTask;
        }

        var slug = httpContext.Request.RouteValues["slug"]?.ToString();
        var action = httpContext.Request.RouteValues["toolAction"]?.ToString()
            ?? httpContext.Request.RouteValues["action"]?.ToString();

        if (string.IsNullOrWhiteSpace(slug) || string.IsNullOrWhiteSpace(action))
        {
            return Task.CompletedTask;
        }

        var authType = context.User.Identity?.AuthenticationType ?? "unknown";
        logger.LogInformation(
            "Evaluating {Policy} policy for {Slug}/{Action} using auth type {AuthenticationType}.",
            ToolActionRequirement.PolicyName,
            slug,
            action,
            authType);

        var permissions = context.User.FindAll(ToolActionRequirement.ClaimType).Select(c => c.Value);
        var requiredPermission = $"{slug}:{action}";
        var slugWildcard = $"{slug}:*";

        if (!permissions.Contains(requiredPermission, StringComparer.OrdinalIgnoreCase)
            && !permissions.Contains(slugWildcard, StringComparer.OrdinalIgnoreCase)
            && !permissions.Contains("*:*", StringComparer.OrdinalIgnoreCase))
        {
            logger.LogWarning("Authorization denied due to missing tool permission claim for {Slug}/{Action}.", slug, action);
            return Task.CompletedTask;
        }

        var manifest = manifestGovernance.FindBySlug(slug);
        if (manifest is not null && manifest.SecurityLevel == ToolSecurityLevel.High)
        {
            var hasHighSecurityClaim = context.User.FindAll(SecurityLevelClaimType)
                .Select(c => c.Value)
                .Any(v => string.Equals(v, ToolSecurityLevel.High.ToString(), StringComparison.OrdinalIgnoreCase));

            if (!hasHighSecurityClaim)
            {
                logger.LogWarning("Authorization denied for high-security tool {Slug}: missing {ClaimType}=High claim.", slug, SecurityLevelClaimType);
                return Task.CompletedTask;
            }
        }

        context.Succeed(requirement);
        return Task.CompletedTask;
    }
}
