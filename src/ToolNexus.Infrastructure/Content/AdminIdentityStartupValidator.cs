using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using ToolNexus.Application.Services;

namespace ToolNexus.Infrastructure.Content;

public sealed class AdminIdentityStartupValidator(
    IServiceProvider serviceProvider,
    IDatabaseInitializationState initializationState,
    ILogger<AdminIdentityStartupValidator> logger) : IStartupPhaseService
{
    public int Order => 7;

    public string PhaseName => "Admin Identity Startup Validation";

    public async Task ExecuteAsync(CancellationToken cancellationToken)
    {
        try
        {
            await initializationState.WaitForReadyAsync(cancellationToken);
        }
        catch (InvalidOperationException ex)
        {
            logger.LogWarning(ex, "Skipping admin identity startup validation because database initialization did not reach ready state.");
            return;
        }

        using var scope = serviceProvider.CreateScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<IdentityUser>>();
        var hasAdmin = await userManager.Users.AnyAsync(
            user => user.Email != null && user.Email.ToLower() == "dummy@dummy.com",
            cancellationToken);

        if (!hasAdmin)
        {
            logger.LogError("[AUTH CRITICAL] No admin user found.");
        }
    }
}
