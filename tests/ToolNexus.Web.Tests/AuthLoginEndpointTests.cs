using System.Net;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Xunit;

namespace ToolNexus.Web.Tests;

public sealed class AuthLoginEndpointTests
{
    [Fact]
    public async Task GetLogin_Unauthenticated_ReturnsOk()
    {
        await using var factory = new TestWebApplicationFactory(Environments.Development);
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });

        var response = await client.GetAsync("/auth/login");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }


    [Fact]
    public async Task GetLogin_NonDevelopment_ReturnsOk()
    {
        await using var factory = new TestWebApplicationFactory("IntegrationTests");
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });

        var response = await client.GetAsync("/auth/login");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetAccessDenied_ReturnsOk()
    {
        await using var factory = new TestWebApplicationFactory("IntegrationTests");
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });

        var response = await client.GetAsync("/auth/access-denied");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    private sealed class TestWebApplicationFactory(string environmentName) : WebApplicationFactory<Program>
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment(environmentName);
            builder.ConfigureAppConfiguration((_, configBuilder) =>
            {
                configBuilder.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["ManifestPath"] = Path.Combine(AppContext.BaseDirectory, "../../../../tools.manifest.json"),
                    ["Database:Provider"] = "Sqlite",
                    ["Database:ConnectionString"] = $"Data Source={Path.Combine(Path.GetTempPath(), $"toolnexus-web-tests-{Guid.NewGuid():N}.db")}",
                    ["Database:RunMigrationOnStartup"] = "false",
                    ["Database:RunSeedOnStartup"] = "false",
                    ["ConnectionStrings:Redis"] = string.Empty
                });
            });

            builder.ConfigureServices(services =>
            {
                var hostedServiceDescriptors = services
                    .Where(service => service.ServiceType == typeof(IHostedService))
                    .ToList();

                foreach (var descriptor in hostedServiceDescriptors)
                {
                    services.Remove(descriptor);
                }
            });
        }
    }
}
