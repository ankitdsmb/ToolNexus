using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Npgsql;
using ToolNexus.Infrastructure.Data;
using ToolNexus.Infrastructure.Options;

namespace ToolNexus.Infrastructure.Content;

public sealed class DatabaseInitializationHostedService(
    IServiceProvider serviceProvider,
    IHostApplicationLifetime applicationLifetime,
    IOptions<DatabaseInitializationOptions> options,
    DatabaseInitializationState state,
    ILogger<DatabaseInitializationHostedService> logger) : BackgroundService
{
    private static readonly TimeSpan[] MigrationRetryDelays =
    [
        TimeSpan.FromSeconds(2),
        TimeSpan.FromSeconds(4),
        TimeSpan.FromSeconds(6),
        TimeSpan.FromSeconds(8),
        TimeSpan.FromSeconds(10)
    ];

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await WaitForHostStartupAsync(stoppingToken);

        if (stoppingToken.IsCancellationRequested)
        {
            return;
        }

        using var scope = serviceProvider.CreateScope();
        var initializer = scope.ServiceProvider.GetRequiredService<ToolContentSeedHostedService>();

        try
        {
            if (options.Value.RunMigrationOnStartup)
            {
                var dbContext = scope.ServiceProvider.GetRequiredService<ToolNexusContentDbContext>();
                await MigrateWithRetryAsync(dbContext, stoppingToken);
            }

            await initializer.InitializeAsync(
                runMigration: false,
                options.Value.RunSeedOnStartup,
                stoppingToken);
            state.MarkReady();
            logger.LogInformation("Database initialization completed. Migration enabled: {RunMigration}. Seed enabled: {RunSeed}.",
                options.Value.RunMigrationOnStartup,
                options.Value.RunSeedOnStartup);
        }
        catch (Exception ex)
        {
            state.MarkFailed(ex.Message);
            logger.LogError(ex, "Database initialization failed. Host will continue running.");
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

    private async Task WaitForHostStartupAsync(CancellationToken cancellationToken)
    {
        if (applicationLifetime.ApplicationStarted.IsCancellationRequested)
        {
            return;
        }

        var tcs = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        using var startedRegistration = applicationLifetime.ApplicationStarted.Register(
            static callbackState => ((TaskCompletionSource)callbackState!).TrySetResult(),
            tcs);
        using var cancellationRegistration = cancellationToken.Register(
            static callbackState => ((TaskCompletionSource)callbackState!).TrySetCanceled(),
            tcs);
        await tcs.Task;
    }
}
