using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using ToolNexus.Application.Services;
using ToolNexus.Infrastructure.Content.Entities;
using ToolNexus.Infrastructure.Data;

namespace ToolNexus.Infrastructure.Content;

public sealed class ToolContentSeedHostedService(
    IServiceProvider serviceProvider,
    JsonFileToolManifestRepository manifestRepository,
    ILogger<ToolContentSeedHostedService> logger)
{

    public async Task InitializeAsync(bool runMigration, bool runSeed, CancellationToken cancellationToken)
    {
        if (runMigration)
        {
            logger.LogInformation("Database migration phase is delegated to DatabaseInitializationHostedService.");
        }

        if (!runSeed)
        {
            logger.LogInformation("Tool content seed skipped by configuration.");
            return;
        }

        using var scope = serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ToolNexusContentDbContext>();
        var providerName = ResolveProviderName(dbContext);
        logger.LogInformation("Using DB Provider: {Provider}", providerName);

        var appliedMigrations = (await dbContext.Database.GetAppliedMigrationsAsync(cancellationToken)).ToArray();
        logger.LogInformation("Applied migrations ({Count}): {AppliedMigrations}",
            appliedMigrations.Length,
            appliedMigrations.Length == 0 ? "none" : string.Join(", ", appliedMigrations));

        await LogDatabaseTargetAndMigrationStateAsync(dbContext, cancellationToken);


        var tools = manifestRepository.LoadTools();


        var requiredTables = new[] { "ToolDefinitions", "ToolContents", "ToolExecutionPolicies", "ToolExecutionEvents" };
        foreach (var requiredTable in requiredTables)
        {
            var exists = await TableExistsAsync(dbContext, requiredTable, cancellationToken);
            if (!exists)
            {
                logger.LogError("Required table {TableName} is missing. Check database provider configuration and migration state.", requiredTable);
            }
        }

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

        var seededToolsCount = await dbContext.ToolDefinitions.CountAsync(cancellationToken);
        logger.LogInformation("Tool seed count after initialization: {Count}", seededToolsCount);
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

            var result = await command.ExecuteScalarAsync(cancellationToken);
            var count = result switch
            {
                null => 0,
                int intValue => intValue,
                long longValue => (int)longValue,
                decimal decimalValue => (int)decimalValue,
                _ => Convert.ToInt32(result)
            };

            return count > 0;
        }
        finally
        {
            await dbContext.Database.CloseConnectionAsync();
        }
    }

    private static string ResolveProviderName(ToolNexusContentDbContext dbContext)
    {
        if (dbContext.Database.IsSqlite())
        {
            return "Sqlite";
        }

        if (dbContext.Database.IsNpgsql())
        {
            return "PostgreSQL";
        }

        return dbContext.Database.ProviderName ?? "Unknown";
    }

}
