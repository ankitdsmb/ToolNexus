using Microsoft.EntityFrameworkCore;
using Npgsql;

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

        builder.UseNpgsql(NormalizePostgreSqlConnectionString(connectionString), options =>
        {
            options.MigrationsHistoryTable("__EFMigrationsHistory");
        });
    }

    private static string NormalizePostgreSqlConnectionString(string connectionString)
    {
        if (!connectionString.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase)
            && !connectionString.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
        {
            return connectionString;
        }

        var uri = new Uri(connectionString);
        var builder = new NpgsqlConnectionStringBuilder
        {
            Host = uri.Host,
            Port = uri.IsDefaultPort ? 5432 : uri.Port,
            Database = uri.AbsolutePath.TrimStart('/'),
            SslMode = SslMode.Require
        };

        if (!string.IsNullOrWhiteSpace(uri.UserInfo))
        {
            var userInfoParts = uri.UserInfo.Split(':', 2);
            builder.Username = Uri.UnescapeDataString(userInfoParts[0]);

            if (userInfoParts.Length > 1)
            {
                builder.Password = Uri.UnescapeDataString(userInfoParts[1]);
            }
        }

        var query = System.Web.HttpUtility.ParseQueryString(uri.Query);
        if (!string.IsNullOrWhiteSpace(query["sslmode"]) && Enum.TryParse<SslMode>(query["sslmode"], true, out var sslMode))
        {
            builder.SslMode = sslMode;
        }

        if (!string.IsNullOrWhiteSpace(query["channel_binding"]) && Enum.TryParse<ChannelBinding>(query["channel_binding"], true, out var channelBinding))
        {
            builder.ChannelBinding = channelBinding;
        }

        return builder.ConnectionString;
    }
}
