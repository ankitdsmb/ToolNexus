using System.Security.Claims;
using Microsoft.Extensions.Options;
using ToolNexus.Web.Options;

namespace ToolNexus.Web.Security;

public interface IInternalUserPrincipalFactory
{
    ClaimsPrincipal CreatePrincipal();
}

public sealed class InternalUserPrincipalFactory(IOptions<InternalAuthOptions> authOptions) : IInternalUserPrincipalFactory
{
    public ClaimsPrincipal CreatePrincipal()
    {
        var options = authOptions.Value;

        if (string.IsNullOrWhiteSpace(options.UserId))
        {
            throw new InvalidOperationException("Internal authentication is not configured.");
        }

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, options.UserId),
            new(ClaimTypes.Name, options.DisplayName)
        };

        claims.AddRange(options.ToolPermissions.Select(permission => new Claim("tool_permission", permission)));
        claims.AddRange(options.SecurityLevels.Select(level => new Claim("tool_security_level", level)));

        var identity = new ClaimsIdentity(claims, "Cookies");
        return new ClaimsPrincipal(identity);
    }
}
