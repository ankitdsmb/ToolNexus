using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;

namespace ToolNexus.Api.IntegrationTests;

public sealed class TestWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly string _dbPath = Path.Combine(Path.GetTempPath(), $"toolnexus.integrationtests.{Guid.NewGuid():N}.db");
    private readonly ITestConnectionResolver _connectionResolver;

    public TestWebApplicationFactory()
        : this(new TestConnectionResolver())
    {
    }

    internal TestWebApplicationFactory(ITestConnectionResolver connectionResolver)
    {
        _connectionResolver = connectionResolver;
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("IntegrationTests");
        builder.ConfigureAppConfiguration((_, configBuilder) =>
        {
            var resolution = _connectionResolver.Resolve();
            var settings = BuildSettings(resolution, $"Data Source={_dbPath}");
            configBuilder.AddInMemoryCollection(settings);
        });
    }

    internal static Dictionary<string, string?> BuildSettings(TestConnectionResolution resolution, string sqliteFallbackConnectionString)
    {
        var settings = new Dictionary<string, string?>
        {
            ["Redis:Enabled"] = "false"
        };

        if (resolution.IsValid && !string.IsNullOrWhiteSpace(resolution.Provider) && !string.IsNullOrWhiteSpace(resolution.ConnectionString))
        {
            settings["Database:Provider"] = resolution.Provider;
            settings["Database:ConnectionString"] = resolution.ConnectionString;
            return settings;
        }

        settings["Database:Provider"] = "Sqlite";
        settings["Database:ConnectionString"] = sqliteFallbackConnectionString;
        return settings;
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);

        if (File.Exists(_dbPath))
        {
            File.Delete(_dbPath);
        }
    }
}
