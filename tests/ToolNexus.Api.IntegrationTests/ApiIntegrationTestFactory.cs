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
    private readonly ITestConnectionResolver _connectionResolver = new TestConnectionResolver();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("IntegrationTest");

        var resolution = _connectionResolver.Resolve();
        if (!resolution.IsValid || string.IsNullOrWhiteSpace(resolution.ConnectionString))
        {
            throw new InvalidOperationException($"A valid PostgreSQL test connection is required. Check {resolution.SourcePath}.");
        }

        builder.ConfigureAppConfiguration((_, configBuilder) =>
        {
            var settings = new Dictionary<string, string?>
            {
                ["ConnectionStrings:Redis"] = string.Empty,
                ["OpenTelemetry:Enabled"] = "false",
                ["Database:Provider"] = "PostgreSQL",
                ["Database:ConnectionString"] = resolution.ConnectionString
            };

            configBuilder.AddInMemoryCollection(settings);
        });

        builder.ConfigureServices(services =>
        {
            services.RemoveAll<IHostedService>();
            services.AddHostedService<ToolContentSeedHostedService>();
        });
    }
}
