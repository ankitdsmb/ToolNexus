using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;

namespace ToolNexus.Api.IntegrationTests;

public sealed class ToolsEndpointIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public ToolsEndpointIntegrationTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.WithWebHostBuilder(_ => { }).CreateClient();
    }

    [Fact]
    public async Task Get_ToolEndpoint_ReturnsSuccess_ForValidSlugAndAction()
    {
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
        var response = await _client.GetAsync("/api/tools/json-formatter/invalid-action?input=%7B%22name%22%3A%22Ada%22%7D");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<ToolExecutionResponse>();
        Assert.NotNull(payload);
        Assert.False(payload!.Success);
        Assert.Contains("not supported", payload.Error, StringComparison.OrdinalIgnoreCase);
    }

    private sealed record ToolExecutionResponse(bool Success, string Output, string Error, bool NotFound = false);
}
