using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Npgsql;
using System.Reflection;
using ToolNexus.Application.Services;
using ToolNexus.Infrastructure.Data;
using ToolNexus.Infrastructure.Options;

namespace ToolNexus.Infrastructure.Content;

public sealed class DatabaseInitializationHostedService(
    IServiceProvider serviceProvider,
    IOptions<DatabaseInitializationOptions> options,
    DatabaseInitializationState state,
    IHostEnvironment hostEnvironment,
    IConfiguration configuration,
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
        var effectiveProvider = configuration["Database:Provider"] ?? options.Value.Provider;
        var effectiveConnectionString = configuration["Database:ConnectionString"]
            ?? options.Value.ConnectionString;

        LogConnectivityIntent(effectiveProvider, effectiveConnectionString);

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
            if (await TryRunDevelopmentFallbackAsync(ex, stoppingToken))
            {
                state.MarkReady();
                return;
            }

            var startupError = BuildStartupFailureMessage(ex);
            state.MarkFailed(startupError);
            logger.LogWarning(ex,
                "Database initialization failed during startup. Host will continue in degraded mode with execution disabled until database connectivity is restored. Error: {StartupError}",
                startupError);
        }
    }

    private async Task<bool> TryRunDevelopmentFallbackAsync(Exception startupException, CancellationToken cancellationToken)
    {
        if (!hostEnvironment.IsDevelopment()
            || !options.Value.EnableDevelopmentFallbackConnection
            || string.IsNullOrWhiteSpace(options.Value.DevelopmentFallbackConnectionString)
            || !IsTransientPostgresStartupException(startupException))
        {
            return false;
        }

        logger.LogWarning(startupException,
            "Primary PostgreSQL connection is unavailable. Development fallback connection is enabled and will be attempted.");

        var fallbackConnectionString = options.Value.DevelopmentFallbackConnectionString!;

        var contentOptionsBuilder = new DbContextOptionsBuilder<ToolNexusContentDbContext>();
        DatabaseProviderConfiguration.Configure(contentOptionsBuilder, DatabaseProviderConfiguration.PostgreSqlProvider, fallbackConnectionString);
        await using var contentDb = new ToolNexusContentDbContext(contentOptionsBuilder.Options);
        await MigrateWithRetryAsync(contentDb, cancellationToken);

        var identityOptionsBuilder = new DbContextOptionsBuilder<ToolNexusIdentityDbContext>();
        DatabaseProviderConfiguration.Configure(identityOptionsBuilder, DatabaseProviderConfiguration.PostgreSqlProvider, fallbackConnectionString);
        await using var identityDb = new ToolNexusIdentityDbContext(identityOptionsBuilder.Options);
        await MigrateWithRetryAsync(identityDb, cancellationToken);

        logger.LogWarning("Development fallback database migration completed successfully using fallback connection.");
        return true;
    }

    private void LogConnectivityIntent(string provider, string connectionString)
    {
        if (string.Equals(provider, DatabaseProviderConfiguration.PostgreSqlProvider, StringComparison.OrdinalIgnoreCase)
            || string.Equals(provider, "Postgres", StringComparison.OrdinalIgnoreCase)
            || string.Equals(provider, "Npgsql", StringComparison.OrdinalIgnoreCase))
        {
            try
            {
                var builder = new NpgsqlConnectionStringBuilder(connectionString);
                logger.LogInformation(
                    "Database startup connectivity target => Provider={Provider}; Host={Host}; Port={Port}; Database={Database}; Username={Username}; MigrationsOnStartup={MigrationsOnStartup}; DevelopmentFallbackEnabled={DevelopmentFallbackEnabled}",
                    provider,
                    builder.Host,
                    builder.Port,
                    builder.Database,
                    string.IsNullOrWhiteSpace(builder.Username) ? "<not-set>" : builder.Username,
                    options.Value.RunMigrationOnStartup,
                    options.Value.EnableDevelopmentFallbackConnection);
                return;
            }
            catch
            {
                // Continue to generic logging if parsing fails.
            }
        }

        logger.LogInformation(
            "Database startup connectivity target => Provider={Provider}; Connection={Connection}; MigrationsOnStartup={MigrationsOnStartup}; DevelopmentFallbackEnabled={DevelopmentFallbackEnabled}",
            provider,
            string.IsNullOrWhiteSpace(connectionString) ? "<missing>" : "<configured>",
            options.Value.RunMigrationOnStartup,
            options.Value.EnableDevelopmentFallbackConnection);
    }

    private string BuildStartupFailureMessage(Exception exception)
    {
        var postgresException = FindPostgresException(exception);
        var provider = configuration["Database:Provider"] ?? options.Value.Provider;

        var sqlState = postgresException?.SqlState ?? "<none>";
        var postgresMessage = postgresException?.MessageText ?? exception.Message;

        return $"Database initialization failed for provider '{provider}'. PostgreSQL did not become available or migrations could not be applied. SQLSTATE={sqlState}. Detail={postgresMessage}. Verify Database:ConnectionString and PostgreSQL readiness (docker compose up postgres).";
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
                await EnsureOptimizationLedgerSchemaAsync(dbContext, cancellationToken);
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
            await EnsureOptimizationLedgerSchemaAsync(dbContext, cancellationToken);
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

    private static async Task EnsureOptimizationLedgerSchemaAsync(DbContext dbContext, CancellationToken cancellationToken)
    {
        if (dbContext is not ToolNexusContentDbContext)
        {
            return;
        }

        if (!string.Equals(
                dbContext.Database.ProviderName,
                "Npgsql.EntityFrameworkCore.PostgreSQL",
                StringComparison.Ordinal))
        {
            return;
        }

        await dbContext.Database.ExecuteSqlRawAsync(
            """
            CREATE TABLE IF NOT EXISTS optimization_recommendations (
                recommendation_id uuid NOT NULL,
                domain character varying(64) NOT NULL,
                target_node_id character varying(120) NOT NULL,
                reason character varying(2000) NOT NULL,
                confidence_score numeric(5,4) NOT NULL,
                suggested_change character varying(2000) NOT NULL,
                risk_impact character varying(2000) NOT NULL,
                expected_benefit character varying(2000) NOT NULL,
                correlation_id character varying(120) NOT NULL,
                tenant_id character varying(120) NOT NULL,
                rollback_metadata jsonb NOT NULL,
                generated_at_utc timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
                status character varying(32) NOT NULL,
                CONSTRAINT "PK_optimization_recommendations" PRIMARY KEY (recommendation_id)
            );

            CREATE TABLE IF NOT EXISTS optimization_simulations (
                simulation_id uuid NOT NULL,
                recommendation_id uuid NOT NULL,
                simulation_summary character varying(3000) NOT NULL,
                projected_risk_delta numeric(8,4) NOT NULL,
                projected_benefit_delta numeric(8,4) NOT NULL,
                approved_for_review boolean NOT NULL,
                source_snapshot_ids jsonb NOT NULL,
                synthetic_workload_ref character varying(200) NOT NULL,
                governance_replay_ref character varying(200) NOT NULL,
                simulated_at_utc timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "PK_optimization_simulations" PRIMARY KEY (simulation_id)
            );

            CREATE TABLE IF NOT EXISTS optimization_applications (
                application_id uuid NOT NULL,
                recommendation_id uuid NOT NULL,
                action_type character varying(32) NOT NULL,
                operator_id character varying(120) NOT NULL,
                authority_context character varying(120) NOT NULL,
                notes character varying(2000),
                scheduled_for_utc timestamp with time zone,
                applied_at_utc timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "PK_optimization_applications" PRIMARY KEY (application_id)
            );

            CREATE TABLE IF NOT EXISTS optimization_outcomes (
                outcome_id uuid NOT NULL,
                recommendation_id uuid NOT NULL,
                outcome_status character varying(64) NOT NULL,
                benefit_realized numeric(8,4) NOT NULL,
                risk_realized numeric(8,4) NOT NULL,
                measured_by character varying(120) NOT NULL,
                measured_at_utc timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "PK_optimization_outcomes" PRIMARY KEY (outcome_id)
            );

            CREATE INDEX IF NOT EXISTS idx_optimization_recommendations_correlation ON optimization_recommendations (correlation_id);
            CREATE INDEX IF NOT EXISTS idx_optimization_recommendations_tenant ON optimization_recommendations (tenant_id);
            CREATE INDEX IF NOT EXISTS idx_optimization_recommendations_generated_at ON optimization_recommendations (generated_at_utc DESC);
            CREATE INDEX IF NOT EXISTS idx_optimization_simulations_recommendation ON optimization_simulations (recommendation_id);
            CREATE INDEX IF NOT EXISTS idx_optimization_simulations_simulated_at ON optimization_simulations (simulated_at_utc DESC);
            CREATE INDEX IF NOT EXISTS idx_optimization_applications_recommendation ON optimization_applications (recommendation_id);
            CREATE INDEX IF NOT EXISTS idx_optimization_applications_applied_at ON optimization_applications (applied_at_utc DESC);
            CREATE INDEX IF NOT EXISTS idx_optimization_outcomes_recommendation ON optimization_outcomes (recommendation_id);
            CREATE INDEX IF NOT EXISTS idx_optimization_outcomes_measured_at ON optimization_outcomes (measured_at_utc DESC);
            """,
            cancellationToken);
    }
    private async Task AlignMigrationHistoryForExistingSchemaAsync(
    DbContext dbContext,
    CancellationToken cancellationToken)
    {
        if (dbContext is not ToolNexusContentDbContext)
            return;

        if (!string.Equals(
                dbContext.Database.ProviderName,
                "Npgsql.EntityFrameworkCore.PostgreSQL",
                StringComparison.Ordinal))
            return;

        // EF SqlQueryRaw<T> expects column alias "Value"
        var schemaLooksBootstrapped =
            await dbContext.Database
                .SqlQueryRaw<bool>(
                    """
                SELECT (
                    to_regclass('execution_runs') IS NOT NULL
                    AND to_regclass('execution_snapshots') IS NOT NULL
                ) AS "Value"
                """
                )
                .SingleAsync(cancellationToken);

        if (!schemaLooksBootstrapped)
            return;

        await dbContext.Database.ExecuteSqlRawAsync(
            """
        CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
            "MigrationId" character varying(150) NOT NULL,
            "ProductVersion" character varying(32) NOT NULL,
            CONSTRAINT "PK___EFMigrationsHistory"
                PRIMARY KEY ("MigrationId")
        )
        """,
            cancellationToken);

        // EF SqlQueryRaw<T> requires AS "Value"
        var historyCount =
            await dbContext.Database
                .SqlQueryRaw<int>(
                    """
                SELECT COUNT(*) AS "Value"
                FROM "__EFMigrationsHistory"
                """
                )
                .SingleAsync(cancellationToken);

        if (historyCount > 0)
            return;

        const string ProductVersion = "8.0.0";
        var migrationsAssembly = dbContext.GetService<IMigrationsAssembly>();
        var allMigrations = migrationsAssembly.Migrations
            .Where(static pair =>
            {
                var contextAttribute = pair.Value.GetCustomAttribute<DbContextAttribute>();
                return contextAttribute?.ContextType == typeof(ToolNexusContentDbContext);
            })
            .Select(static pair => pair.Key)
            .OrderBy(static migrationId => migrationId, StringComparer.Ordinal)
            .ToArray();

        foreach (var migrationId in allMigrations)
        {
            await dbContext.Database.ExecuteSqlInterpolatedAsync(
                $"""
            INSERT INTO "__EFMigrationsHistory"
                ("MigrationId", "ProductVersion")
            VALUES ({migrationId}, {ProductVersion})
            ON CONFLICT ("MigrationId") DO NOTHING
            """,
                cancellationToken);
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
