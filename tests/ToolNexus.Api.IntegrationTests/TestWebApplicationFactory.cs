using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;

namespace ToolNexus.Api.IntegrationTests;

public sealed class TestWebApplicationFactory : WebApplicationFactory<Program>
{
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
            var settings = BuildSettings(resolution);
            configBuilder.AddInMemoryCollection(settings);
        });
    }

    internal static Dictionary<string, string?> BuildSettings(TestConnectionResolution resolution)
    {
        if (!resolution.IsValid || string.IsNullOrWhiteSpace(resolution.ConnectionString))
        {
            throw new InvalidOperationException($"A valid PostgreSQL test connection is required. Check {resolution.SourcePath}.");
        }

        return new Dictionary<string, string?>
        {
            ["Redis:Enabled"] = "false",
            ["Database:Provider"] = "PostgreSQL",
            ["Database:ConnectionString"] = resolution.ConnectionString
        };
    }
}
