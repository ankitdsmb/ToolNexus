using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using ToolNexus.Infrastructure.Content;

namespace ToolNexus.Api.IntegrationTests;

public sealed class ApiIntegrationTestFactory : WebApplicationFactory<Program>
{
    private readonly string _databasePath = Path.Combine(Path.GetTempPath(), $"toolnexus-api-integration-tests-{Guid.NewGuid():N}.db");

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("IntegrationTest");

        var postgresConnectionString = Environment.GetEnvironmentVariable("TOOLNEXUS_TEST_POSTGRES_CONNECTION_STRING");
        var usePostgres = !string.IsNullOrWhiteSpace(postgresConnectionString);

        builder.ConfigureAppConfiguration((_, configBuilder) =>
        {
            var settings = new Dictionary<string, string?>
            {
                ["ConnectionStrings:Redis"] = string.Empty,
                ["OpenTelemetry:Enabled"] = "false"
            };

            if (usePostgres)
            {
                settings["Database:Provider"] = "Postgres";
                settings["Database:ConnectionString"] = postgresConnectionString;
            }
            else
            {
                settings["Database:Provider"] = "Sqlite";
                settings["Database:ConnectionString"] = $"Data Source={_databasePath}";
            }

            configBuilder.AddInMemoryCollection(settings);
        });

        builder.ConfigureServices(services =>
        {
            services.RemoveAll<IHostedService>();
            services.AddHostedService<ToolContentSeedHostedService>();
        });
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);

        if (disposing && File.Exists(_databasePath))
        {
            File.Delete(_databasePath);
        }
    }
}
