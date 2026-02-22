using Microsoft.EntityFrameworkCore;

namespace ToolNexus.Infrastructure.Data;

internal static class DatabaseProviderConfiguration
{
    internal const string SqliteProvider = "Sqlite";
    internal const string PostgreSqlProvider = "PostgreSQL";

    internal static string NormalizeProvider(string? provider)
    {
        if (provider is null)
        {
            return SqliteProvider;
        }

        if (provider.Equals(SqliteProvider, StringComparison.OrdinalIgnoreCase))
        {
            return SqliteProvider;
        }

        if (provider.Equals(PostgreSqlProvider, StringComparison.OrdinalIgnoreCase)
            || provider.Equals("Postgres", StringComparison.OrdinalIgnoreCase)
            || provider.Equals("Npgsql", StringComparison.OrdinalIgnoreCase))
        {
            return PostgreSqlProvider;
        }

        throw new NotSupportedException($"Unsupported database provider '{provider}'. Supported providers: {SqliteProvider}, {PostgreSqlProvider}.");
    }

    internal static void Configure(DbContextOptionsBuilder builder, string? provider, string connectionString)
    {
        var normalizedProvider = NormalizeProvider(provider);

        if (normalizedProvider.Equals(SqliteProvider, StringComparison.Ordinal))
        {
            builder.UseSqlite(connectionString);
            return;
        }

        builder.UseNpgsql(connectionString, options =>
        {
            options.MigrationsHistoryTable("__EFMigrationsHistory");
        });
    }
}
