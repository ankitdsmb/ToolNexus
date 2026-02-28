using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Xunit;

namespace ToolNexus.Api.IntegrationTests;

public sealed class DatabaseInitializationStartupBehaviorTests
{
    [Fact]
    public async Task HostStartup_WithInvalidConnection_RemainsAvailableInDegradedMode()
    {
        await using var factory = new UnavailableDatabaseFactory();
        using var client = factory.CreateClient();

        var rootResponse = await client.GetAsync("/");
        Assert.Equal(HttpStatusCode.OK, rootResponse.StatusCode);

        var healthResponse = await client.GetAsync("/health/runtime");
        Assert.Equal(HttpStatusCode.OK, healthResponse.StatusCode);

        using var healthContent = JsonDocument.Parse(await healthResponse.Content.ReadAsStringAsync());
        Assert.False(healthContent.RootElement.GetProperty("db_connected").GetBoolean());
        Assert.False(healthContent.RootElement.GetProperty("execution_ready").GetBoolean());
    }

    [Fact]
    public async Task ToolExecution_WhenDatabaseOffline_ReturnsExecutionUnavailableContract()
    {
        await using var factory = new UnavailableDatabaseFactory();
        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", CreateToken("json-formatter:format"));
        client.DefaultRequestHeaders.Add("X-API-KEY", "replace-with-production-api-key");

        var response = await client.GetAsync("/api/v1/tools/json-formatter/format?input=%7B%22name%22%3A%22Ada%22%7D");

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<ToolExecutionResponse>();
        Assert.NotNull(payload);
        Assert.False(payload!.Success);
        Assert.Equal("execution_unavailable_database_offline", payload.Error);
    }

    private sealed record ToolExecutionResponse(bool Success, string? Output, string? Error, bool NotFound = false);

    private sealed class UnavailableDatabaseFactory : WebApplicationFactory<Program>
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("IntegrationTest");
            builder.ConfigureAppConfiguration((_, configBuilder) =>
            {
                var settings = new Dictionary<string, string?>
                {
                    ["ConnectionStrings:Redis"] = string.Empty,
                    ["OpenTelemetry:Enabled"] = "false",
                    ["Database:Provider"] = "Postgres",
                    ["Database:ConnectionString"] = "Host=127.0.0.1;Port=59999;Database=toolnexus;Username=bad;Password=bad;SSL Mode=Disable;Timeout=1;Command Timeout=1",
                    ["Database:RunMigrationOnStartup"] = "true",
                    ["Database:RunSeedOnStartup"] = "false"
                };

                configBuilder.AddInMemoryCollection(settings);
            });
        }
    }

    private static string CreateToken(params string[] permissions)
    {
        var handler = new JwtSecurityTokenHandler();
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes("toolnexus-development-signing-key-change-in-production"));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = permissions.Select(permission => new Claim("tool_permission", permission)).ToList();

        var token = new JwtSecurityToken(
            issuer: "ToolNexus",
            audience: "ToolNexus.Api",
            claims: claims,
            notBefore: DateTime.UtcNow.AddMinutes(-1),
            expires: DateTime.UtcNow.AddMinutes(10),
            signingCredentials: credentials);

        return handler.WriteToken(token);
    }
}
