using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
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
    public async Task Get_ToolManifest_ReturnsVersionedContracts()
    {
        var response = await _client.GetAsync("/api/v1/tools/manifest");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<List<ToolManifestV1>>();
        Assert.NotNull(payload);
        Assert.NotEmpty(payload!);
        Assert.All(payload!, x => Assert.Equal("1.0", x.SchemaVersion));
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
        Assert.NotNull(payload.Metadata);
    }

    [Fact]
    public async Task Get_ToolEndpoint_ReturnsNotFound_ForUnknownSlug()
    {
        var response = await _client.GetAsync("/api/tools/not-real/format?input=%7B%22name%22%3A%22Ada%22%7D");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<ToolExecutionResponse>();
        Assert.NotNull(payload);
        Assert.False(payload!.Success);
        Assert.Equal("tool_not_found", payload.Error?.Code);
    }

    [Fact]
    public async Task Get_ToolEndpoint_ReturnsBadRequest_ForUnsupportedAction()
    {
        var response = await _client.GetAsync("/api/tools/json-formatter/invalid-action?input=%7B%22name%22%3A%22Ada%22%7D");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<ToolExecutionResponse>();
        Assert.NotNull(payload);
        Assert.False(payload!.Success);
        Assert.Equal("action_not_supported", payload.Error?.Code);
    }

    [Fact]
    public async Task Post_ToolEndpoint_ReturnsSuccess_ForValidSlugAndAction()
    {
        var response = await _client.PostAsJsonAsync(
            "/api/v1/tools/json-formatter",
            new
            {
                action = "format",
                input = "{\"name\":\"Ada\"}"
            });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<ToolExecutionResponse>();
        Assert.NotNull(payload);
        Assert.True(payload!.Success);
        Assert.Contains("\n", payload.Output);
        Assert.Null(payload.Error);
    }

    private sealed record ToolManifestV1(string SchemaVersion, string Slug, string Name);
    private sealed record ToolExecutionResponse(bool Success, string? Output, ToolError? Error, ToolExecutionMetadata Metadata);
    private sealed record ToolError(string Code, string Message, string? Detail);
    private sealed record ToolExecutionMetadata(long ExecutionTimeMs, bool FromCache);
}
