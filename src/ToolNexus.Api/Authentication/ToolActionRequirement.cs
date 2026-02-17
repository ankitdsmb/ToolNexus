using Microsoft.AspNetCore.Authorization;

namespace ToolNexus.Api.Authentication;

/// <summary>
/// Requires a JWT claim that authorizes execution of the current tool/action route.
/// Expected claim type: tool_permission with values like slug:action, slug:*, *:*
/// </summary>
public sealed class ToolActionRequirement : IAuthorizationRequirement
{
    public const string PolicyName = "tool-action";
    public const string ClaimType = "tool_permission";
}
