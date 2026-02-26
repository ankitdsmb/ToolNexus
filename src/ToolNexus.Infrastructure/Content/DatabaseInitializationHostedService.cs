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
        await AlignMigrationHistoryForExistingSchemaAsync(dbContext, cancellationToken);

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
                LogLegacyAliasColumnDrift(targetMigration, postgresException);
                logger.LogCritical(ex,
                    "STRUCTURAL MIGRATION FAILURE detected for context {ContextType}. Migration: {MigrationName}. SQLSTATE: {SqlState}. Table: {TableName}. Column: {ColumnName}. ConversionStrategy: {ConversionStrategy}. Message: {PostgresMessage}. Detail: {PostgresDetail}. Where: {PostgresWhere}. Routine: {PostgresRoutine}. Startup retry was aborted because schema mismatch errors are non-transient.",
                    contextName,
                    targetMigration,
                    postgresException?.SqlState ?? "<none>",
                    postgresException?.TableName ?? "<unknown>",
                    postgresException?.ColumnName ?? "<unknown>",
                    InferConversionStrategy(postgresException),
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
                "Migration execution failed for context {ContextType}. Migration: {MigrationName}. SQLSTATE: {SqlState}. Table: {TableName}. Column: {ColumnName}. ConversionStrategy: {ConversionStrategy}. Message: {PostgresMessage}. Detail: {PostgresDetail}. Where: {PostgresWhere}. Routine: {PostgresRoutine}",
                contextName,
                targetMigration,
                postgresException?.SqlState ?? "<none>",
                postgresException?.TableName ?? "<unknown>",
                postgresException?.ColumnName ?? "<unknown>",
                InferConversionStrategy(postgresException),
                postgresException?.MessageText ?? ex.Message,
                postgresException?.Detail ?? "<none>",
                postgresException?.Where ?? "<none>",
                postgresException?.Routine ?? "<none>");
            throw;
        }
    }

    private async Task AlignMigrationHistoryForExistingSchemaAsync(DbContext dbContext, CancellationToken cancellationToken)
    {
        if (dbContext is not ToolNexusContentDbContext)
        {
            return;
        }

        if (!string.Equals(dbContext.Database.ProviderName, "Npgsql.EntityFrameworkCore.PostgreSQL", StringComparison.Ordinal))
        {
            return;
        }

        var schemaLooksBootstrapped = await dbContext.Database.SqlQueryRaw<bool>("""
            SELECT (
                to_regclass('execution_runs') IS NOT NULL
                AND to_regclass('execution_snapshots') IS NOT NULL
            );
            """).SingleAsync(cancellationToken);

        if (!schemaLooksBootstrapped)
        {
            return;
        }

        await dbContext.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
                "MigrationId" character varying(150) NOT NULL,
                "ProductVersion" character varying(32) NOT NULL,
                CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
            );
            """, cancellationToken);

        var historyCount = await dbContext.Database.SqlQueryRaw<int>("""
            SELECT COUNT(*) FROM "__EFMigrationsHistory";
            """).SingleAsync(cancellationToken);
        if (historyCount > 0)
        {
            return;
        }

        const string ProductVersion = "8.0.0";
        var allMigrations = dbContext.Database.GetMigrations().ToArray();
        foreach (var migrationId in allMigrations)
        {
            await dbContext.Database.ExecuteSqlInterpolatedAsync($"""
                INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
                VALUES ({migrationId}, {ProductVersion})
                ON CONFLICT ("MigrationId") DO NOTHING;
                """, cancellationToken);
        }

        logger.LogInformation(
            "Aligned migration history for existing schema by marking all content migrations as applied. MigrationCount: {MigrationCount}",
            allMigrations.Length);
    }


    private void LogLegacyAliasColumnDrift(string migrationName, PostgresException? postgresException)
    {
        if (postgresException?.SqlState != PostgresErrorCodes.UndefinedColumn)
        {
            return;
        }

        var message = postgresException.MessageText ?? string.Empty;
        var hasExecutionRunAliasDrift = message.Contains("er.id", StringComparison.OrdinalIgnoreCase);
        var hasExecutionSnapshotAliasDrift = message.Contains("es.id", StringComparison.OrdinalIgnoreCase);

        if (!hasExecutionRunAliasDrift && !hasExecutionSnapshotAliasDrift)
        {
            return;
        }

        logger.LogError(
            "Migration schema drift detected. Migration: {MigrationName}. MissingAliasColumns: {MissingAliasColumns}.",
            migrationName,
            string.Join(", ", new[]
            {
                hasExecutionRunAliasDrift ? "er.id (execution_runs)" : null,
                hasExecutionSnapshotAliasDrift ? "es.id (execution_snapshots)" : null
            }.Where(static alias => alias is not null)!));
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


    private static string InferConversionStrategy(PostgresException? postgresException)
    {
        if (postgresException is null)
        {
            return "none";
        }

        var message = (postgresException.MessageText ?? string.Empty).ToLowerInvariant();
        var column = (postgresException.ColumnName ?? string.Empty).ToLowerInvariant();

        if (column.Contains("source_ip", StringComparison.Ordinal)
            || message.Contains("inet", StringComparison.Ordinal))
        {
            return "SafeConvertToInet";
        }

        if (message.Contains("boolean", StringComparison.Ordinal))
        {
            return "SafeConvertToBoolean";
        }

        if (message.Contains("identity", StringComparison.Ordinal)
            || postgresException.SqlState == "55000")
        {
            return "EnsureIdentityColumnSafe";
        }

        return "SafeConvertColumn";
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
