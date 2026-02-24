using System.Security.Claims;

namespace ToolNexus.Web.Security;

public static class AdminPermissionClaims
{
    private static readonly string[] ReadPermissions = ["*:*", "admin:*", "admin:read", "admin:write", "AdminRead", "AdminWrite"];
    private static readonly string[] WritePermissions = ["*:*", "admin:*", "admin:write", "AdminWrite"];

    public static bool CanRead(ClaimsPrincipal user)
        => HasAnyPermission(user, ReadPermissions);

    public static bool CanWrite(ClaimsPrincipal user)
        => HasAnyPermission(user, WritePermissions);

    private static bool HasAnyPermission(ClaimsPrincipal user, string[] allowedPermissions)
    {
        var permissions = user.FindAll("tool_permission").Select(claim => claim.Value);
        return permissions.Any(permission => allowedPermissions.Contains(permission, StringComparer.OrdinalIgnoreCase));
    }
}
