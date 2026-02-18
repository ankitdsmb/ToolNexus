using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.IdentityModel.Tokens;
using Xunit;

namespace ToolNexus.Api.IntegrationTests;

public sealed class ToolsEndpointIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public ToolsEndpointIntegrationTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.WithWebHostBuilder(_ => { }).CreateClient();
    }

    [Fact]
    public async Task Get_ToolEndpoint_ReturnsMethodNotAllowed()
    {
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", CreateToken("json-formatter:format"));

        var response = await _client.GetAsync("/api/v1/tools/json-formatter/format?input=%7B%22name%22%3A%22Ada%22%7D");

        Assert.Equal(HttpStatusCode.MethodNotAllowed, response.StatusCode);
    }

    [Fact]
    public async Task Post_ToolEndpoint_ReturnsSuccess_ForValidSlugAndAction()
    {
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", CreateToken("json-formatter:format"));

        var response = await _client.PostAsJsonAsync(
            "/api/v1/tools/json-formatter/format",
            new
            {
                input = "{\"name\":\"Ada\"}"
            });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<ToolExecutionResponse>();
        Assert.NotNull(payload);
        Assert.True(payload!.Success);
        Assert.Contains("\n", payload.Output);
        Assert.Null(payload.Error);
    }


    [Fact]
    public async Task Post_ToolEndpoint_ReturnsSuccess_ForJsonValidator()
    {
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", CreateToken("json-validator:validate"));

        // This tool requires an API key in addition to the token because its policy allows anonymous access?
        // No, actually json-validator uses Default policy which has AllowAnonymous: false.
        // The integration test environment uses this placeholder key (see appsettings.json).
        _client.DefaultRequestHeaders.Add("X-API-KEY", "replace-with-production-api-key");

        var response = await _client.PostAsJsonAsync(
            "/api/v1/tools/json-validator/validate",
            new
            {
                input = "{\"valid\":true}"
            });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<ToolExecutionResponse>();
        Assert.NotNull(payload);
        Assert.True(payload!.Success);
        Assert.Equal("Valid JSON", payload.Output);
        Assert.Null(payload.Error);
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

    private sealed record ToolExecutionResponse(bool Success, string Output, string Error, bool NotFound = false);
}
