using Microsoft.AspNetCore.Mvc;
using ToolNexus.Api.Controllers.Admin;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using Xunit;

namespace ToolNexus.Api.IntegrationTests;

public sealed class RuntimeIncidentsEndpointIntegrationTests
{
    [Fact]
    public async Task PostIncident_AcceptsBatch()
    {
        var service = new StubRuntimeIncidentService();
        var controller = new RuntimeIncidentsController(service);

        var result = await controller.Post(new RuntimeIncidentIngestBatch([
            new RuntimeIncidentIngestRequest("json-formatter", "execute", "contract_violation", "legacy mismatch", null, "html_element", DateTime.UtcNow, 1, "f1")
        ]), CancellationToken.None);

        Assert.IsType<AcceptedResult>(result);
        Assert.Single(service.Ingested);
    }

    [Fact]
    public async Task GetToolHealth_ReturnsSnapshots()
    {
        var service = new StubRuntimeIncidentService
        {
            Health =
            [
                new RuntimeToolHealthSnapshot("json-formatter", 76, 4, DateTime.UtcNow, "legacy mismatch")
            ]
        };

        var controller = new RuntimeIncidentsController(service);

        var result = await controller.GetToolHealth(CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var payload = Assert.IsAssignableFrom<IReadOnlyList<RuntimeToolHealthSnapshot>>(ok.Value);
        Assert.Single(payload);
        Assert.Equal("json-formatter", payload[0].Slug);
    }

    private sealed class StubRuntimeIncidentService : IRuntimeIncidentService
    {
        public List<RuntimeIncidentIngestBatch> Ingested { get; } = [];
        public IReadOnlyList<RuntimeToolHealthSnapshot> Health { get; set; } = [];

        public Task IngestAsync(RuntimeIncidentIngestBatch batch, CancellationToken cancellationToken)
        {
            Ingested.Add(batch);
            return Task.CompletedTask;
        }

        public Task<IReadOnlyList<RuntimeIncidentSummary>> GetLatestSummariesAsync(int take, CancellationToken cancellationToken)
            => Task.FromResult<IReadOnlyList<RuntimeIncidentSummary>>([]);

        public Task<IReadOnlyList<RuntimeToolHealthSnapshot>> GetToolHealthAsync(CancellationToken cancellationToken)
            => Task.FromResult(Health);
    }
}
