using System.Security.Claims;

namespace ToolNexus.Api.Authentication;

public static class AdminPermissionClaims
{
    public const string PermissionClaimType = "tool_permission";

    private static readonly string[] ReadPermissions = ["*:*", "admin:*", "admin:read", "admin:write"];
    private static readonly string[] WritePermissions = ["*:*", "admin:*", "admin:write"];

    public static bool CanRead(ClaimsPrincipal user)
        => HasAnyPermission(user, ReadPermissions);

    public static bool CanWrite(ClaimsPrincipal user)
        => HasAnyPermission(user, WritePermissions);

    private static bool HasAnyPermission(ClaimsPrincipal user, string[] allowedPermissions)
    {
        var permissions = user.FindAll(PermissionClaimType).Select(claim => claim.Value);
        return permissions.Any(permission => allowedPermissions.Contains(permission, StringComparer.OrdinalIgnoreCase));
    }
}
