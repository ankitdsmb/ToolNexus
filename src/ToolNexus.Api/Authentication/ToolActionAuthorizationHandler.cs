using Microsoft.AspNetCore.Authorization;

namespace ToolNexus.Api.Authentication;

public sealed class ToolActionAuthorizationHandler : AuthorizationHandler<ToolActionRequirement>
{
    protected override Task HandleRequirementAsync(AuthorizationHandlerContext context, ToolActionRequirement requirement)
    {
        if (context.Resource is not HttpContext httpContext)
        {
            return Task.CompletedTask;
        }

        var slug = httpContext.Request.RouteValues["slug"]?.ToString();
        var action = httpContext.Request.RouteValues["action"]?.ToString();

        if (string.IsNullOrWhiteSpace(slug) || string.IsNullOrWhiteSpace(action))
        {
            return Task.CompletedTask;
        }

        var permissions = context.User.FindAll(ToolActionRequirement.ClaimType).Select(c => c.Value);
        var requiredPermission = $"{slug}:{action}";
        var slugWildcard = $"{slug}:*";

        if (permissions.Contains(requiredPermission, StringComparer.OrdinalIgnoreCase)
            || permissions.Contains(slugWildcard, StringComparer.OrdinalIgnoreCase)
            || permissions.Contains("*:*", StringComparer.OrdinalIgnoreCase))
        {
            context.Succeed(requirement);
        }

        return Task.CompletedTask;
    }
}
