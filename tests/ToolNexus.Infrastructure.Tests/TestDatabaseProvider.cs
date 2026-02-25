using Xunit;
using Xunit.Sdk;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using ToolNexus.Infrastructure.Data;

namespace ToolNexus.Infrastructure.Tests;

public enum TestDatabaseProvider
{
    Sqlite,
    PostgreSql
}

public static class TestDatabaseProviderMatrix
{
    private const string ProviderSelectionVariable = "TOOLNEXUS_TEST_PROVIDER";

    public static IEnumerable<object[]> AllConfiguredProviders()
    {
        var selectedProvider = Environment.GetEnvironmentVariable(ProviderSelectionVariable);

        if (ShouldIncludeSqlite(selectedProvider))
        {
            yield return [TestDatabaseProvider.Sqlite];
        }

        if (ShouldIncludePostgres(selectedProvider) && !string.IsNullOrWhiteSpace(PostgreSqlAdminConnectionString))
        {
            yield return [TestDatabaseProvider.PostgreSql];
        }
    }

    internal static bool ShouldIncludeSqlite(string? selectedProvider) =>
        string.IsNullOrWhiteSpace(selectedProvider)
        || selectedProvider.Equals("all", StringComparison.OrdinalIgnoreCase)
        || selectedProvider.Equals("sqlite", StringComparison.OrdinalIgnoreCase);

    internal static bool ShouldIncludePostgres(string? selectedProvider) =>
        string.IsNullOrWhiteSpace(selectedProvider)
        || selectedProvider.Equals("all", StringComparison.OrdinalIgnoreCase)
        || selectedProvider.Equals("postgres", StringComparison.OrdinalIgnoreCase)
        || selectedProvider.Equals("postgresql", StringComparison.OrdinalIgnoreCase);

    public static string? PostgreSqlAdminConnectionString =>
        Environment.GetEnvironmentVariable("TOOLNEXUS_TEST_POSTGRES_CONNECTION");
}

public sealed class ProviderTheoryData : TheoryData<TestDatabaseProvider>
{
    public ProviderTheoryData()
    {
        foreach (var row in TestDatabaseProviderMatrix.AllConfiguredProviders())
        {
            Add((TestDatabaseProvider)row[0]);
        }
    }
}

public sealed class TestDatabaseInstance : IAsyncDisposable
{
    private readonly string? adminConnectionString;
    private readonly string? databaseName;
    private readonly string? providerConnectionString;
    private readonly string? sqlitePath;

    private TestDatabaseInstance(TestDatabaseProvider provider, string? adminConnectionString, string? databaseName, string? providerConnectionString, string? sqlitePath)
    {
        Provider = provider;
        this.adminConnectionString = adminConnectionString;
        this.databaseName = databaseName;
        this.providerConnectionString = providerConnectionString;
        this.sqlitePath = sqlitePath;
    }

    public TestDatabaseProvider Provider { get; }

    public static async Task<TestDatabaseInstance> CreateAsync(TestDatabaseProvider provider)
        => await CreateInternalAsync(provider, applyMigrations: true);

    public static async Task<TestDatabaseInstance> CreateUnmigratedAsync(TestDatabaseProvider provider)
        => await CreateInternalAsync(provider, applyMigrations: false);

    public static async Task<TestDatabaseInstance> CreateLegacySqliteSchemaAsync()
    {
        var instance = await CreateInternalAsync(TestDatabaseProvider.Sqlite, applyMigrations: false);
        await using var context = instance.CreateContext();
        await context.Database.EnsureCreatedAsync();
        return instance;
    }

    private static async Task<TestDatabaseInstance> CreateInternalAsync(TestDatabaseProvider provider, bool applyMigrations)
    {
        if (provider == TestDatabaseProvider.Sqlite)
        {
            var sqlitePath = Path.Combine(Path.GetTempPath(), $"toolnexus-tests-{Guid.NewGuid():N}.db");
            var connectionString = $"Data Source={sqlitePath}";
            var instance = new TestDatabaseInstance(provider, null, null, connectionString, sqlitePath);

            if (applyMigrations)
            {
                await using var context = instance.CreateContext();
                await context.Database.EnsureCreatedAsync();
            }

            return instance;
        }

        var adminConnection = TestDatabaseProviderMatrix.PostgreSqlAdminConnectionString;
        if (string.IsNullOrWhiteSpace(adminConnection))
        {
            throw new InvalidOperationException("PostgreSQL test database not configured.");
        }

        var databaseName = $"toolnexus_tests_{Guid.NewGuid():N}";

        try
        {
            await using var admin = new NpgsqlConnection(adminConnection);
            await admin.OpenAsync();

            await using (var create = admin.CreateCommand())
            {
                create.CommandText = $"CREATE DATABASE \"{databaseName}\"";
                await create.ExecuteNonQueryAsync();
            }
        }
        catch (Exception ex) when (ex is NpgsqlException or InvalidOperationException)
        {
            throw new SkipException();
        }

        var builder = new NpgsqlConnectionStringBuilder(adminConnection)
        {
            Database = databaseName
        };

        var instancePostgres = new TestDatabaseInstance(provider, adminConnection, databaseName, builder.ConnectionString, null);

        if (applyMigrations)
        {
            await using var db = instancePostgres.CreateContext();
            await db.Database.MigrateAsync();
        }

        return instancePostgres;
    }

    public ToolNexusContentDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<ToolNexusContentDbContext>();

        if (Provider == TestDatabaseProvider.Sqlite)
        {
            options.UseSqlite(providerConnectionString!);
        }
        else
        {
            options.UseNpgsql(providerConnectionString!);
        }

        return new ToolNexusContentDbContext(options.Options);
    }

    public async ValueTask DisposeAsync()
    {
        if (Provider == TestDatabaseProvider.Sqlite)
        {
            if (!string.IsNullOrWhiteSpace(sqlitePath) && File.Exists(sqlitePath))
            {
                File.Delete(sqlitePath);
            }

            return;
        }

        try
        {
            await using var admin = new NpgsqlConnection(adminConnectionString);
            await admin.OpenAsync();

            await using (var terminate = admin.CreateCommand())
            {
                terminate.CommandText = """
                    SELECT pg_terminate_backend(pid)
                    FROM pg_stat_activity
                    WHERE datname = @databaseName AND pid <> pg_backend_pid();
                    """;
                terminate.Parameters.AddWithValue("databaseName", databaseName!);
                await terminate.ExecuteNonQueryAsync();
            }

            await using var drop = admin.CreateCommand();
            drop.CommandText = $"DROP DATABASE IF EXISTS \"{databaseName}\"";
            await drop.ExecuteNonQueryAsync();
        }
        catch (NpgsqlException)
        {
            // Best-effort cleanup for restricted/shared PostgreSQL environments.
        }
        catch (InvalidOperationException)
        {
            // Best-effort cleanup for restricted/shared PostgreSQL environments.
        }
    }
}
