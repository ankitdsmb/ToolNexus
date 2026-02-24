using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ToolNexus.Application.Services;
using ToolNexus.Infrastructure.Content.Entities;
using ToolNexus.Infrastructure.Data;
using ToolNexus.Infrastructure.Options;

namespace ToolNexus.Infrastructure.Content;

public sealed class AdminIdentitySeedHostedService(
    IServiceProvider serviceProvider,
    IDatabaseInitializationState initializationState,
    IHostEnvironment environment,
    IOptions<AdminBootstrapOptions> options,
    ILogger<AdminIdentitySeedHostedService> logger) : IStartupPhaseService
{
    public int Order => 6;

    public string PhaseName => "Admin Identity Bootstrap";

    public async Task ExecuteAsync(CancellationToken cancellationToken)
    {
        await initializationState.WaitForReadyAsync(cancellationToken);
        using var scope = serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ToolNexusContentDbContext>();
        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<object>>();

        if (dbContext.Database.IsNpgsql())
        {
            await dbContext.Database.ExecuteSqlRawAsync(
                """
                CREATE TABLE IF NOT EXISTS admin_identity_users (
                    "Id" uuid NOT NULL PRIMARY KEY,
                    "Email" character varying(320) NOT NULL,
                    "NormalizedEmail" character varying(320) NOT NULL,
                    "DisplayName" character varying(120) NOT NULL,
                    "PasswordHash" character varying(1024) NOT NULL,
                    "AccessFailedCount" integer NOT NULL DEFAULT 0,
                    "LockoutEndUtc" timestamp with time zone NULL,
                    "CreatedAtUtc" timestamp with time zone NOT NULL
                );
                CREATE UNIQUE INDEX IF NOT EXISTS "IX_admin_identity_users_NormalizedEmail" ON admin_identity_users ("NormalizedEmail");

                ALTER TABLE admin_identity_users
                ALTER COLUMN "Id" TYPE uuid USING "Id"::uuid,
                ALTER COLUMN "LockoutEndUtc" TYPE timestamp with time zone USING NULLIF("LockoutEndUtc", '')::timestamp with time zone,
                ALTER COLUMN "CreatedAtUtc" TYPE timestamp with time zone USING "CreatedAtUtc"::timestamp with time zone;
                """,
                cancellationToken);
        }
        else
        {
            await dbContext.Database.ExecuteSqlRawAsync(
                """
                CREATE TABLE IF NOT EXISTS admin_identity_users (
                    "Id" TEXT NOT NULL PRIMARY KEY,
                    "Email" TEXT NOT NULL,
                    "NormalizedEmail" TEXT NOT NULL,
                    "DisplayName" TEXT NOT NULL,
                    "PasswordHash" TEXT NOT NULL,
                    "AccessFailedCount" INTEGER NOT NULL DEFAULT 0,
                    "LockoutEndUtc" TEXT NULL,
                    "CreatedAtUtc" TEXT NOT NULL
                );
                CREATE UNIQUE INDEX IF NOT EXISTS IX_admin_identity_users_NormalizedEmail ON admin_identity_users ("NormalizedEmail");
                """,
                cancellationToken);
        }

        var settings = options.Value;
        if (string.IsNullOrWhiteSpace(settings.Email) || string.IsNullOrWhiteSpace(settings.Password))
        {
            var message = "Admin bootstrap credentials are required via AdminBootstrap__Email and AdminBootstrap__Password.";
            if (environment.IsProduction())
            {
                throw new InvalidOperationException(message);
            }

            logger.LogWarning("{Message} Skipping admin identity seed in development.", message);
            return;
        }

        var normalizedEmail = settings.Email.Trim().ToUpperInvariant();
        var existing = await dbContext.AdminIdentityUsers.SingleOrDefaultAsync(x => x.NormalizedEmail == normalizedEmail, cancellationToken);
        if (existing is not null)
        {
            return;
        }

        var user = new AdminIdentityUserEntity
        {
            Email = settings.Email.Trim(),
            NormalizedEmail = normalizedEmail,
            DisplayName = string.IsNullOrWhiteSpace(settings.DisplayName) ? "ToolNexus Administrator" : settings.DisplayName.Trim(),
            PasswordHash = hasher.HashPassword(new object(), settings.Password)
        };

        dbContext.AdminIdentityUsers.Add(user);
        await dbContext.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Seeded admin identity bootstrap user for {Email}.", user.Email);
    }
}
