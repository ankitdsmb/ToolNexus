using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Npgsql;
using ToolNexus.Application.Services;
using ToolNexus.Infrastructure.Data;
using ToolNexus.Infrastructure.Options;

namespace ToolNexus.Infrastructure.Content;

public sealed class DatabaseInitializationHostedService(
    IServiceProvider serviceProvider,
    IOptions<DatabaseInitializationOptions> options,
    DatabaseInitializationState state,
    ILogger<DatabaseInitializationHostedService> logger) : IStartupPhaseService
{
    private static readonly TimeSpan[] MigrationRetryDelays =
    [
        TimeSpan.FromSeconds(2),
        TimeSpan.FromSeconds(4),
        TimeSpan.FromSeconds(6),
        TimeSpan.FromSeconds(8),
        TimeSpan.FromSeconds(10)
    ];

    public int Order => 0;

    public string PhaseName => "Database Initialization";

    public async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            if (options.Value.RunMigrationOnStartup)
            {
                logger.LogInformation("Database migration started.");
                using var scope = serviceProvider.CreateScope();
                var dbContext = scope.ServiceProvider.GetRequiredService<ToolNexusContentDbContext>();
                await MigrateWithRetryAsync(dbContext, stoppingToken);
                logger.LogInformation("Database migration completed.");
            }

            state.MarkReady();
            logger.LogInformation("Database initialization completed and readiness signal was set. Migration enabled: {RunMigration}.",
                options.Value.RunMigrationOnStartup);
        }
        catch (Exception ex)
        {
            state.MarkFailed(ex.Message);
            logger.LogError(ex, "Database initialization failed.");
            throw;
        }
    }

    private async Task MigrateWithRetryAsync(ToolNexusContentDbContext dbContext, CancellationToken cancellationToken)
    {
        for (var attempt = 0; attempt <= MigrationRetryDelays.Length; attempt++)
        {
            try
            {
                await dbContext.Database.MigrateAsync(cancellationToken);
                return;
            }
            catch (Exception ex) when (IsTransientPostgresStartupException(ex) && attempt < MigrationRetryDelays.Length)
            {
                var retryDelay = MigrationRetryDelays[attempt];
                logger.LogWarning(ex,
                    "Database migration attempt {Attempt} failed while waiting for PostgreSQL readiness. Retrying in {DelaySeconds}s.",
                    attempt + 1,
                    retryDelay.TotalSeconds);

                await Task.Delay(retryDelay, cancellationToken);
            }
        }

        await dbContext.Database.MigrateAsync(cancellationToken);
    }

    private static bool IsTransientPostgresStartupException(Exception exception)
    {
        return exception is TimeoutException
               || exception is NpgsqlException
               || exception.InnerException is NpgsqlException;
    }
}
