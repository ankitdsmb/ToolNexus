using System.Text.Json;

namespace ToolNexus.Api.IntegrationTests;

public sealed class TestConnectionResolver : ITestConnectionResolver
{
    private const string ConnectionFileName = "testcs.txt";
    private readonly string _repositoryRoot;

    public TestConnectionResolver(string? repositoryRoot = null)
    {
        _repositoryRoot = repositoryRoot ?? FindRepositoryRoot() ?? Directory.GetCurrentDirectory();
    }

    public TestConnectionResolution Resolve()
    {
        var path = Path.Combine(_repositoryRoot, ConnectionFileName);
        if (!File.Exists(path))
        {
            return TestConnectionResolution.Invalid(path);
        }

        var raw = File.ReadAllText(path).Trim();
        if (string.IsNullOrWhiteSpace(raw))
        {
            return TestConnectionResolution.Invalid(path);
        }

        var (provider, connectionString) = ParseConfiguration(raw);

        if (!IsPostgresProvider(provider) || string.IsNullOrWhiteSpace(connectionString))
        {
            return TestConnectionResolution.Invalid(path);
        }

        if (!IsLikelyPostgresConnectionString(connectionString))
        {
            return TestConnectionResolution.Invalid(path);
        }

        return new TestConnectionResolution(true, "PostgreSQL", connectionString, path);
    }

    private static (string? Provider, string? ConnectionString) ParseConfiguration(string raw)
    {
        var candidateJson = raw.StartsWith("{", StringComparison.Ordinal) ? raw : $"{{{raw}}}";

        try
        {
            using var document = JsonDocument.Parse(candidateJson);
            var root = document.RootElement;
            if (root.TryGetProperty("Database", out var databaseNode))
            {
                var provider = databaseNode.TryGetProperty("Provider", out var providerNode)
                    ? providerNode.GetString()
                    : null;
                var connectionString = databaseNode.TryGetProperty("ConnectionString", out var connectionNode)
                    ? connectionNode.GetString()
                    : null;
                return (provider, connectionString);
            }
        }
        catch (JsonException)
        {
            // Allow raw PostgreSQL connection strings for backward compatibility.
        }

        return ("PostgreSQL", raw);
    }

    private static bool IsPostgresProvider(string? provider)
        => !string.IsNullOrWhiteSpace(provider)
            && (provider.Equals("PostgreSQL", StringComparison.OrdinalIgnoreCase)
                || provider.Equals("Postgres", StringComparison.OrdinalIgnoreCase)
                || provider.Equals("Npgsql", StringComparison.OrdinalIgnoreCase));

    private static bool IsLikelyPostgresConnectionString(string connectionString)
        => connectionString.Contains("Host=", StringComparison.OrdinalIgnoreCase)
           || connectionString.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase)
           || connectionString.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase);

    private static string? FindRepositoryRoot()
    {
        var current = new DirectoryInfo(AppContext.BaseDirectory);
        while (current is not null)
        {
            if (File.Exists(Path.Combine(current.FullName, "ToolNexus.sln")))
            {
                return current.FullName;
            }

            current = current.Parent;
        }

        return null;
    }
}
