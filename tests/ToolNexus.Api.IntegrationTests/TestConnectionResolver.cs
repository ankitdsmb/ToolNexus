using System.Data.Common;

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

        var provider = DetectProvider(raw);
        if (provider is null)
        {
            return TestConnectionResolution.Invalid(path);
        }

        if (!IsValidConnectionString(raw))
        {
            return TestConnectionResolution.Invalid(path);
        }

        return new TestConnectionResolution(true, provider, raw, path);
    }

    private static string? DetectProvider(string connectionString)
    {
        if (connectionString.Contains("Host=", StringComparison.OrdinalIgnoreCase) ||
            connectionString.Contains("Username=", StringComparison.OrdinalIgnoreCase) ||
            connectionString.Contains("Port=", StringComparison.OrdinalIgnoreCase))
        {
            return "Postgres";
        }

        if (connectionString.Contains("Data Source=", StringComparison.OrdinalIgnoreCase) ||
            connectionString.Contains("Filename=", StringComparison.OrdinalIgnoreCase))
        {
            return "Sqlite";
        }

        return null;
    }

    private static bool IsValidConnectionString(string connectionString)
    {
        try
        {
            var builder = new DbConnectionStringBuilder
            {
                ConnectionString = connectionString
            };

            return builder.Count > 0;
        }
        catch
        {
            return false;
        }
    }

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
