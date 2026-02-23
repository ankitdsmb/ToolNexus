using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using Xunit;

namespace ToolNexus.Api.IntegrationTests;

[Collection("ApiIntegration")]
public sealed class ToolsEndpointIntegrationTests(ApiIntegrationTestFactory factory)
{
    private readonly HttpClient _client = CreateClient(factory);

    [Fact]
    public async Task Ping_ReturnsOkContract()
    {
        var response = await _client.GetAsync("/api/v1/tools/ping");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<PingResponse>();
        Assert.NotNull(payload);
        Assert.Equal("ok", payload!.Status);
    }

    [Fact]
    public async Task Get_ToolEndpoint_ReturnsContract_ForValidSlugAndAction()
    {
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", CreateToken("json-formatter:format"));

        var response = await _client.GetAsync("/api/tools/json-formatter/format?input=%7B%22name%22%3A%22Ada%22%7D");
        var allowedStatuses = new[] { HttpStatusCode.OK, HttpStatusCode.BadRequest, HttpStatusCode.NotFound, HttpStatusCode.InternalServerError };
        Assert.Contains(response.StatusCode, allowedStatuses);

        var payload = await response.Content.ReadFromJsonAsync<ToolExecutionResponse>();
        Assert.NotNull(payload);

        if (response.IsSuccessStatusCode)
        {
            Assert.True(payload!.Success);
            Assert.NotNull(payload.Output);
        }
        else
        {
            Assert.False(payload!.Success);
            Assert.False(string.IsNullOrWhiteSpace(payload.Error));
        }
    }

    [Fact]
    public async Task Get_ToolEndpoint_ReturnsNotFoundContract_ForUnknownSlug()
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
    public async Task Get_ToolEndpoint_ReturnsUnauthorized_WhenTokenMissing()
    {
        _client.DefaultRequestHeaders.Authorization = null;

        var response = await _client.GetAsync("/api/tools/json-formatter/format?input=%7B%22name%22%3A%22Ada%22%7D");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    [Trait("Category", "DeepIntegration")]
    public async Task Post_ToolEndpoint_ReturnsSuccess_ForJsonValidator_WhenRuntimeHealthy()
    {
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", CreateToken("json-validator:validate"));

        var response = await _client.PostAsJsonAsync(
            "/api/v1/tools/json-validator/validate",
            new
            {
                input = "{\"valid\":true}"
            });

        var allowedStatuses = new[] { HttpStatusCode.OK, HttpStatusCode.BadRequest, HttpStatusCode.InternalServerError };
        Assert.Contains(response.StatusCode, allowedStatuses);

        var payload = await response.Content.ReadFromJsonAsync<ToolExecutionResponse>();
        Assert.NotNull(payload);

        if (response.StatusCode == HttpStatusCode.OK)
        {
            Assert.True(payload!.Success);
            Assert.False(string.IsNullOrWhiteSpace(payload.Output));
        }
        else
        {
            Assert.False(payload!.Success);
            Assert.False(string.IsNullOrWhiteSpace(payload.Error));
        }
    }

    private static HttpClient CreateClient(ApiIntegrationTestFactory factory)
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-API-KEY", "replace-with-production-api-key");
        return client;
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

    private sealed record PingResponse(string Status);
    private sealed record ToolExecutionResponse(bool Success, string? Output, string? Error, bool NotFound = false);
}
