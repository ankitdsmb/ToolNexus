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
                var identityDbContext = scope.ServiceProvider.GetRequiredService<ToolNexusIdentityDbContext>();
                await MigrateWithRetryAsync(identityDbContext, stoppingToken);
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

    private async Task MigrateWithRetryAsync(DbContext dbContext, CancellationToken cancellationToken)
    {
        var contextName = dbContext.GetType().Name;
        var pendingMigrations = (await dbContext.Database.GetPendingMigrationsAsync(cancellationToken)).ToArray();
        var targetMigration = pendingMigrations.FirstOrDefault() ?? "<none>";
        logger.LogInformation(
            "Starting migration execution for context {ContextType}. Pending migrations ({PendingCount}): {MigrationList}. Next migration: {MigrationName}",
            contextName,
            pendingMigrations.Length,
            pendingMigrations.Length == 0 ? "<none>" : string.Join(", ", pendingMigrations),
            targetMigration);

        for (var attempt = 0; attempt <= MigrationRetryDelays.Length; attempt++)
        {
            try
            {
                await dbContext.Database.MigrateAsync(cancellationToken);
                logger.LogInformation("Migration execution completed for context {ContextType}.", contextName);
                return;
            }
            catch (Exception ex) when (IsStructuralMigrationException(ex))
            {
                var postgresException = FindPostgresException(ex);
                logger.LogCritical(ex,
                    "STRUCTURAL MIGRATION FAILURE detected for context {ContextType}. Migration: {MigrationName}. SQLSTATE: {SqlState}. Message: {PostgresMessage}. Detail: {PostgresDetail}. Where: {PostgresWhere}. Routine: {PostgresRoutine}. Startup retry was aborted because schema mismatch errors are non-transient.",
                    contextName,
                    targetMigration,
                    postgresException?.SqlState ?? "<none>",
                    postgresException?.MessageText ?? ex.Message,
                    postgresException?.Detail ?? "<none>",
                    postgresException?.Where ?? "<none>",
                    postgresException?.Routine ?? "<none>");

                throw;
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

        try
        {
            await dbContext.Database.MigrateAsync(cancellationToken);
            logger.LogInformation("Migration execution completed for context {ContextType} after retries.", contextName);
        }
        catch (Exception ex)
        {
            var postgresException = FindPostgresException(ex);
            logger.LogError(ex,
                "Migration execution failed for context {ContextType}. Migration: {MigrationName}. SQLSTATE: {SqlState}. Message: {PostgresMessage}. Detail: {PostgresDetail}. Where: {PostgresWhere}. Routine: {PostgresRoutine}",
                contextName,
                targetMigration,
                postgresException?.SqlState ?? "<none>",
                postgresException?.MessageText ?? ex.Message,
                postgresException?.Detail ?? "<none>",
                postgresException?.Where ?? "<none>",
                postgresException?.Routine ?? "<none>");
            throw;
        }
    }

    private static readonly HashSet<string> TransientPostgresSqlStates =
    [
        PostgresErrorCodes.ConnectionException,
        PostgresErrorCodes.ConnectionFailure,
        PostgresErrorCodes.SqlClientUnableToEstablishSqlConnection,
        PostgresErrorCodes.CannotConnectNow,
        PostgresErrorCodes.AdminShutdown,
        PostgresErrorCodes.CrashShutdown,
        PostgresErrorCodes.SystemError,
        PostgresErrorCodes.TooManyConnections
    ];

    private static bool IsTransientPostgresStartupException(Exception exception)
    {
        if (IsStructuralMigrationException(exception))
        {
            return false;
        }

        if (exception is TimeoutException)
        {
            return true;
        }

        var postgresException = FindPostgresException(exception);
        if (postgresException is not null)
        {
            return TransientPostgresSqlStates.Contains(postgresException.SqlState);
        }

        return exception is NpgsqlException && exception.InnerException is null;
    }

    private static readonly HashSet<string> NonRetryableSchemaSqlStates =
    [
        PostgresErrorCodes.UndefinedObject,
        PostgresErrorCodes.UndefinedTable,
        PostgresErrorCodes.UndefinedColumn,
        PostgresErrorCodes.DuplicateTable,
        PostgresErrorCodes.DuplicateObject,
        PostgresErrorCodes.DuplicateColumn,
        PostgresErrorCodes.InvalidColumnReference,
        PostgresErrorCodes.SyntaxError,
        PostgresErrorCodes.DatatypeMismatch,
        "55000" // object_not_in_prerequisite_state (e.g., identity reconfiguration conflicts).
    ];

    private static bool IsStructuralMigrationException(Exception exception)
    {
        var postgresException = FindPostgresException(exception);
        if (postgresException is null)
        {
            return false;
        }

        return NonRetryableSchemaSqlStates.Contains(postgresException.SqlState);
    }

    private static PostgresException? FindPostgresException(Exception exception)
    {
        if (exception is PostgresException postgresException)
        {
            return postgresException;
        }

        if (exception is NpgsqlException npgsqlException && npgsqlException.InnerException is PostgresException innerPostgres)
        {
            return innerPostgres;
        }

        return exception.InnerException is null
            ? null
            : FindPostgresException(exception.InnerException);
    }
}
