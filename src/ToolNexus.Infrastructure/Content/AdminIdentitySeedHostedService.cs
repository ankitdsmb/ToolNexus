using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using ToolNexus.Application.Services;

namespace ToolNexus.Infrastructure.Content;

public sealed class AdminIdentitySeedHostedService(
    IServiceProvider serviceProvider,
    IDatabaseInitializationState initializationState,
    ILogger<AdminIdentitySeedHostedService> logger) : IStartupPhaseService
{
    private const string AdminEmail = "dummy@dummy.com";
    private const string AdminPassword = "Dummy@1234";
    private const string AdminRole = "Admin";

    public int Order => 6;

    public string PhaseName => "Admin Identity Bootstrap";

    public async Task ExecuteAsync(CancellationToken cancellationToken)
    {
        await initializationState.WaitForReadyAsync(cancellationToken);

        using var scope = serviceProvider.CreateScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<IdentityUser>>();
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();

        if (!await roleManager.RoleExistsAsync(AdminRole))
        {
            var createRoleResult = await roleManager.CreateAsync(new IdentityRole(AdminRole));
            if (!createRoleResult.Succeeded)
            {
                throw new InvalidOperationException($"Unable to create role '{AdminRole}': {string.Join(';', createRoleResult.Errors.Select(x => x.Description))}");
            }
        }

        var normalizedEmail = userManager.NormalizeEmail(AdminEmail);
        var user = await userManager.Users.SingleOrDefaultAsync(x => x.NormalizedEmail == normalizedEmail, cancellationToken);
        if (user is null)
        {
            user = new IdentityUser
            {
                UserName = AdminEmail,
                Email = AdminEmail,
                EmailConfirmed = true
            };

            var createUserResult = await userManager.CreateAsync(user, AdminPassword);
            if (!createUserResult.Succeeded)
            {
                throw new InvalidOperationException($"Unable to create admin user: {string.Join(';', createUserResult.Errors.Select(x => x.Description))}");
            }

            logger.LogInformation("[AdminSeed] Created admin user");
        }
        else
        {
            logger.LogInformation("[AdminSeed] Admin already exists");
        }

        if (!await userManager.IsInRoleAsync(user, AdminRole))
        {
            var addRoleResult = await userManager.AddToRoleAsync(user, AdminRole);
            if (!addRoleResult.Succeeded)
            {
                throw new InvalidOperationException($"Unable to assign admin role: {string.Join(';', addRoleResult.Errors.Select(x => x.Description))}");
            }
        }

        await EnsureClaimAsync(userManager, user, "tool_permission", "AdminRead");
        await EnsureClaimAsync(userManager, user, "tool_permission", "AdminWrite");
    }

    private static async Task EnsureClaimAsync(UserManager<IdentityUser> userManager, IdentityUser user, string claimType, string claimValue)
    {
        var claims = await userManager.GetClaimsAsync(user);
        if (claims.Any(c => c.Type == claimType && string.Equals(c.Value, claimValue, StringComparison.OrdinalIgnoreCase)))
        {
            return;
        }

        var result = await userManager.AddClaimAsync(user, new Claim(claimType, claimValue));
        if (!result.Succeeded)
        {
            throw new InvalidOperationException($"Unable to add claim '{claimType}:{claimValue}': {string.Join(';', result.Errors.Select(x => x.Description))}");
        }
    }
}
