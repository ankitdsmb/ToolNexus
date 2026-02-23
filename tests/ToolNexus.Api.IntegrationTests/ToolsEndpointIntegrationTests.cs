using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using Xunit;

namespace ToolNexus.Api.IntegrationTests;

public sealed class ToolsEndpointIntegrationTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly HttpClient _client;

    public ToolsEndpointIntegrationTests(TestWebApplicationFactory factory)
    {
        _client = factory.WithWebHostBuilder(_ => { }).CreateClient();
        // The default policy requires an API key if not AllowAnonymous.
        // We add a valid key from appsettings.json to satisfy this requirement for all tests.
        _client.DefaultRequestHeaders.Add("X-API-KEY", "replace-with-production-api-key");
    }

    [Fact]
    public async Task Get_ToolEndpoint_ReturnsSuccess_ForValidSlugAndAction()
    {
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", CreateToken("json-formatter:format"));

        var response = await _client.GetAsync("/api/tools/json-formatter/format?input=%7B%22name%22%3A%22Ada%22%7D");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<ToolExecutionResponse>();
        Assert.NotNull(payload);
        Assert.True(payload!.Success);
        Assert.Contains("\n", payload.Output);
        Assert.Null(payload.Error);
    }

    [Fact]
    public async Task Get_ToolEndpoint_ReturnsNotFound_ForUnknownSlug()
    {
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", CreateToken("*:*"));

        var response = await _client.GetAsync("/api/tools/not-real/format?input=%7B%22name%22%3A%22Ada%22%7D");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<ToolExecutionResponse>();
        Assert.NotNull(payload);
        Assert.False(payload!.Success);
        Assert.True(payload.NotFound);
    }

    [Fact]
    public async Task Get_ToolEndpoint_ReturnsBadRequest_ForUnsupportedAction()
    {
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", CreateToken("json-formatter:*"));

        var response = await _client.GetAsync("/api/tools/json-formatter/invalid-action?input=%7B%22name%22%3A%22Ada%22%7D");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<ToolExecutionResponse>();
        Assert.NotNull(payload);
        Assert.False(payload!.Success);
        Assert.Contains("not supported", payload.Error, StringComparison.OrdinalIgnoreCase);
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

    [Fact]
    public async Task Get_ToolEndpoint_ReturnsUnauthorized_WhenTokenMissing()
    {
        _client.DefaultRequestHeaders.Authorization = null;
        // Even with API Key, Authorization header is required by [Authorize] policy.

        var response = await _client.GetAsync("/api/tools/json-formatter/format?input=%7B%22name%22%3A%22Ada%22%7D");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
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
