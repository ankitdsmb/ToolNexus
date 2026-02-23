using System.Net;
using System.Net.Http.Json;
using Xunit;

namespace ToolNexus.Api.IntegrationTests;

public sealed class BackgroundHealthEndpointTests : IClassFixture<ApiIntegrationTestFactory>
{
    private readonly HttpClient _client;

    public BackgroundHealthEndpointTests(ApiIntegrationTestFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Get_BackgroundHealth_ReturnsStatusPayload()
    {
        var response = await _client.GetAsync("/health/background");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<BackgroundHealthResponse>();
        Assert.NotNull(payload);
        Assert.True(payload!.QueueSize >= 0);
    }

    private sealed record BackgroundHealthResponse(long QueueSize, bool WorkerActive, DateTime? LastProcessedTimestampUtc);
}
