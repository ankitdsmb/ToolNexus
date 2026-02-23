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

    private sealed class StubRuntimeIncidentService : IRuntimeIncidentService
    {
        public List<RuntimeIncidentIngestBatch> Ingested { get; } = [];

        public Task IngestAsync(RuntimeIncidentIngestBatch batch, CancellationToken cancellationToken)
        {
            Ingested.Add(batch);
            return Task.CompletedTask;
        }

        public Task<IReadOnlyList<RuntimeIncidentSummary>> GetLatestSummariesAsync(int take, CancellationToken cancellationToken)
            => Task.FromResult<IReadOnlyList<RuntimeIncidentSummary>>([]);
    }
}
