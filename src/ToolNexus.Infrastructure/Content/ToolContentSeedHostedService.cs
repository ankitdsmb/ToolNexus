using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Npgsql;
using ToolNexus.Application.Services;
using ToolNexus.Infrastructure.Content.Entities;
using ToolNexus.Infrastructure.Data;

namespace ToolNexus.Infrastructure.Content;

public sealed class ToolContentSeedHostedService(
    IServiceProvider serviceProvider,
    JsonFileToolManifestRepository manifestRepository,
    ILogger<ToolContentSeedHostedService> logger) : IHostedService
{
    private static readonly TimeSpan[] MigrationRetryDelays =
    [
        TimeSpan.FromSeconds(2),
        TimeSpan.FromSeconds(4),
        TimeSpan.FromSeconds(6),
        TimeSpan.FromSeconds(8),
        TimeSpan.FromSeconds(10)
    ];

    private CancellationTokenSource? _startupCts;
    private Task? _startupTask;

    public Task StartAsync(CancellationToken cancellationToken)
    {
        _startupCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        _startupTask = Task.Run(() => InitializeAsync(runMigration: true, runSeed: true, _startupCts.Token), CancellationToken.None);
        return Task.CompletedTask;
    }

    public async Task InitializeAsync(bool runMigration, bool runSeed, CancellationToken cancellationToken)
    {
        if (!runMigration && !runSeed)
        {
            logger.LogInformation("Database initialization skipped because both migration and seed are disabled.");
            return;
        }

        using var scope = serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ToolNexusContentDbContext>();

        await LogDatabaseTargetAndMigrationStateAsync(dbContext, cancellationToken);

        if (runMigration)
        {
            var skipMigrations = await ShouldSkipSqliteMigrationAsync(dbContext, cancellationToken);

            if (skipMigrations)
            {
                logger.LogWarning(
                    "Detected legacy SQLite schema without EF migrations history. Skipping automatic migration to prevent startup failure. " +
                    "Consider baselining this database before cutover.");
            }
            else
            {
                await MigrateWithRetryAsync(dbContext, cancellationToken);
            }
        }

        await EnsureAnalyticsSchemaAsync(dbContext, cancellationToken);

        if (!runSeed)
        {
            logger.LogInformation("Tool content seed skipped by configuration.");
            return;
        }

        var tools = manifestRepository.LoadTools();


        var toolDefinitionsTableExists = await TableExistsAsync(dbContext, "ToolDefinitions", cancellationToken);
        if (!toolDefinitionsTableExists)
        {
            logger.LogWarning("ToolDefinitions table is unavailable; skipping dynamic tool definition seeding for this startup.");
        }
        else if (!await dbContext.ToolDefinitions.AnyAsync(cancellationToken))
        {
            var now = DateTimeOffset.UtcNow;
            foreach (var tool in tools)
            {
                dbContext.ToolDefinitions.Add(new ToolDefinitionEntity
                {
                    Name = tool.Title,
                    Slug = tool.Slug,
                    Description = tool.SeoDescription,
                    Category = tool.Category,
                    Status = "Enabled",
                    Icon = "ti ti-tool",
                    SortOrder = 0,
                    ActionsCsv = string.Join(',', tool.Actions),
                    InputSchema = tool.ExampleInput,
                    OutputSchema = "{}",
                    UpdatedAt = now
                });
            }

            await dbContext.SaveChangesAsync(cancellationToken);
        }

        if (await dbContext.ToolContents.AnyAsync(cancellationToken))
        {
            return;
        }
        foreach (var tool in tools)
        {
            dbContext.ToolContents.Add(new ToolContentEntity
            {
                Slug = tool.Slug,
                Title = tool.Title,
                SeoTitle = tool.SeoTitle,
                SeoDescription = tool.SeoDescription,
                Intro = tool.SeoDescription,
                LongDescription = $"{tool.Title} is designed for fast, no-surprise transformations directly in the browser. It keeps source data local, provides clear output, and supports repeatable developer workflows without requiring a separate desktop utility.",
                Keywords = $"{tool.Title}, {tool.Category}, developer tools",
                Features = tool.Actions.Select((action, index) => new ToolFeatureEntity { Value = action, SortOrder = index }).ToList(),
                Steps =
                [
                    new ToolStepEntity { Title = "Paste or upload source input", Description = "Add the payload you want to process and keep sensitive data redacted when sharing.", SortOrder = 0 },
                    new ToolStepEntity { Title = "Select execution options", Description = "Choose formatting, validation, or conversion options relevant to your stack.", SortOrder = 1 },
                    new ToolStepEntity { Title = "Run and verify output", Description = "Inspect generated output, copy results, and run again with small adjustments.", SortOrder = 2 }
                ],
                Examples =
                [
                    new ToolExampleEntity
                    {
                        Title = "Fix payload before shipping",
                        Input = tool.ExampleInput,
                        Output = "Clean, validated output that can be pasted into production workflows.",
                        SortOrder = 0
                    }
                ],
                Faq =
                [
                    new ToolFaqEntity
                    {
                        Question = $"What does {tool.Title} do?",
                        Answer = tool.SeoDescription,
                        SortOrder = 0
                    }
                ],
                UseCases =
                [
                    new ToolUseCaseEntity { Value = "Debug malformed payloads during API integration.", SortOrder = 0 },
                    new ToolUseCaseEntity { Value = "Normalize test fixtures before adding them to CI regression suites.", SortOrder = 1 }
                ],
                RelatedTools = tools.Where(x => x.Category.Equals(tool.Category, StringComparison.OrdinalIgnoreCase) && x.Slug != tool.Slug)
                    .Take(3)
                    .Select((x, index) => new ToolRelatedEntity { RelatedSlug = x.Slug, SortOrder = index })
                    .ToList()
            });
        }

        var categories = tools.Select(x => x.Category).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        foreach (var category in categories)
        {
            dbContext.ToolCategories.Add(new ToolCategoryEntity
            {
                Slug = category.Trim().ToLowerInvariant(),
                Name = category
            });
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task StopAsync(CancellationToken cancellationToken)
    {
        if (_startupCts is null || _startupTask is null)
        {
            return;
        }

        _startupCts.Cancel();
        await Task.WhenAny(_startupTask, Task.Delay(TimeSpan.FromSeconds(2), cancellationToken));
    }

    private async Task MigrateWithRetryAsync(ToolNexusContentDbContext dbContext, CancellationToken cancellationToken)
    {
        for (var attempt = 0; attempt <= MigrationRetryDelays.Length; attempt++)
        {
            try
            {
                var appliedMigrations = (await dbContext.Database.GetAppliedMigrationsAsync(cancellationToken)).ToArray();
                var pendingMigrations = (await dbContext.Database.GetPendingMigrationsAsync(cancellationToken)).ToArray();
                logger.LogInformation("Migration state before applying updates. Applied={AppliedCount} Pending={PendingCount} AppliedNames={AppliedNames} PendingNames={PendingNames}",
                    appliedMigrations.Length,
                    pendingMigrations.Length,
                    string.Join(",", appliedMigrations),
                    string.Join(",", pendingMigrations));

                await dbContext.Database.MigrateAsync(cancellationToken);

                var appliedAfter = (await dbContext.Database.GetAppliedMigrationsAsync(cancellationToken)).ToArray();
                logger.LogInformation("Migration state after applying updates. Applied={AppliedCount} AppliedNames={AppliedNames}",
                    appliedAfter.Length,
                    string.Join(",", appliedAfter));
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


    private async Task LogDatabaseTargetAndMigrationStateAsync(ToolNexusContentDbContext dbContext, CancellationToken cancellationToken)
    {
        var connectionString = dbContext.Database.GetConnectionString() ?? "<empty>";
        var sanitizedConnectionString = SanitizeConnectionString(connectionString);
        var providerName = dbContext.Database.ProviderName ?? "<unknown>";
        logger.LogInformation("Database target resolved. Provider={Provider} Connection={Connection}", providerName, sanitizedConnectionString);

        var appliedMigrations = (await dbContext.Database.GetAppliedMigrationsAsync(cancellationToken)).ToArray();
        var pendingMigrations = (await dbContext.Database.GetPendingMigrationsAsync(cancellationToken)).ToArray();
        logger.LogInformation("Database migration snapshot. Applied={AppliedCount} Pending={PendingCount} AppliedNames={AppliedNames} PendingNames={PendingNames}",
            appliedMigrations.Length,
            pendingMigrations.Length,
            string.Join(",", appliedMigrations),
            string.Join(",", pendingMigrations));
    }

    private async Task EnsureAnalyticsSchemaAsync(ToolNexusContentDbContext dbContext, CancellationToken cancellationToken)
    {
        var metricsTableExists = await TableExistsAsync(dbContext, "DailyToolMetrics", cancellationToken);
        if (metricsTableExists)
        {
            return;
        }

        logger.LogCritical("DailyToolMetrics table is missing at startup. Triggering self-healing EF migrations.");
        await MigrateWithRetryAsync(dbContext, cancellationToken);
    }

    private static string SanitizeConnectionString(string connectionString)
    {
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            return "<empty>";
        }

        try
        {
            var builder = new Npgsql.NpgsqlConnectionStringBuilder(connectionString);
            if (!string.IsNullOrEmpty(builder.Password))
            {
                builder.Password = "***";
            }

            return builder.ConnectionString;
        }
        catch
        {
            return connectionString;
        }
    }

    private static async Task<bool> TableExistsAsync(ToolNexusContentDbContext dbContext, string tableName, CancellationToken cancellationToken)
    {
        await dbContext.Database.OpenConnectionAsync(cancellationToken);
        try
        {
            var connection = dbContext.Database.GetDbConnection();
            await using var command = connection.CreateCommand();
            if (dbContext.Database.IsSqlite())
            {
                command.CommandText = "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = @tableName;";
            }
            else
            {
                command.CommandText = "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = @tableName;";
            }

            var parameter = command.CreateParameter();
            parameter.ParameterName = "@tableName";
            parameter.Value = tableName;
            command.Parameters.Add(parameter);

            return Convert.ToInt32(await command.ExecuteScalarAsync(cancellationToken)) > 0;
        }
        finally
        {
            await dbContext.Database.CloseConnectionAsync();
        }
    }

    private static bool IsTransientPostgresStartupException(Exception exception)
    {
        return exception is TimeoutException
               || exception is NpgsqlException
               || exception.InnerException is NpgsqlException;
    }

    private static async Task<bool> ShouldSkipSqliteMigrationAsync(ToolNexusContentDbContext dbContext, CancellationToken cancellationToken)
    {
        if (!dbContext.Database.IsSqlite())
        {
            return false;
        }

        await dbContext.Database.OpenConnectionAsync(cancellationToken);
        try
        {
            var connection = dbContext.Database.GetDbConnection();

            await using var schemaCheck = connection.CreateCommand();
            schemaCheck.CommandText = """
                SELECT COUNT(*)
                FROM sqlite_master
                WHERE type = 'table'
                  AND name NOT LIKE 'sqlite_%'
                  AND name <> '__EFMigrationsHistory';
                """;

            var schemaTableCount = Convert.ToInt32(await schemaCheck.ExecuteScalarAsync(cancellationToken));
            if (schemaTableCount == 0)
            {
                return false;
            }

            await using var historyExists = connection.CreateCommand();
            historyExists.CommandText = "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = '__EFMigrationsHistory';";
            var historyTableExists = Convert.ToInt32(await historyExists.ExecuteScalarAsync(cancellationToken)) > 0;

            if (!historyTableExists)
            {
                return true;
            }

            await using var historyRows = connection.CreateCommand();
            historyRows.CommandText = "SELECT COUNT(*) FROM __EFMigrationsHistory;";
            var appliedMigrationsCount = Convert.ToInt32(await historyRows.ExecuteScalarAsync(cancellationToken));

            return appliedMigrationsCount == 0;
        }
        finally
        {
            await dbContext.Database.CloseConnectionAsync();
        }
    }
}
