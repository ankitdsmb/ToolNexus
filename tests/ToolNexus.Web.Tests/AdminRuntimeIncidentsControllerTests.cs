using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Web.Areas.Admin.Controllers.Api;
using Xunit;

namespace ToolNexus.Web.Tests;

public sealed class AdminRuntimeIncidentsControllerTests
{
    [Fact]
    public async Task Post_ReturnsOkAndForwardsIncidents()
    {
        var service = new StubRuntimeIncidentService();
        var controller = new RuntimeIncidentsController(service)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext()
            }
        };
        controller.HttpContext.TraceIdentifier = "trace-123";

        var result = await controller.Post(new RuntimeIncidentIngestBatch([
            new RuntimeIncidentIngestRequest("json-formatter", "execute", "runtime_error", "failed", "critical", "stack", "json", DateTime.UtcNow, 1, "f")
        ]), CancellationToken.None);

        Assert.IsType<OkObjectResult>(result);
        Assert.Equal("trace-123", service.LastBatch!.Incidents[0].CorrelationId);
    }


    [Fact]
    public async Task GetToolHealth_ReturnsSnapshotsFromService()
    {
        var service = new StubRuntimeIncidentService();
        service.ToolHealth = [new RuntimeToolHealthSnapshot("json-formatter", 99, 1, DateTime.UtcNow, "runtime_error")];

        var controller = new RuntimeIncidentsController(service);

        var result = await controller.GetToolHealth(CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var payload = Assert.IsAssignableFrom<IReadOnlyList<RuntimeToolHealthSnapshot>>(ok.Value);
        Assert.Single(payload);
        Assert.Equal("json-formatter", payload[0].Slug);
    }

    private sealed class StubRuntimeIncidentService : IRuntimeIncidentService
    {
        public RuntimeIncidentIngestBatch? LastBatch { get; private set; }

        public IReadOnlyList<RuntimeToolHealthSnapshot> ToolHealth { get; set; } = [];

        public Task IngestAsync(RuntimeIncidentIngestBatch batch, CancellationToken cancellationToken)
        {
            LastBatch = batch;
            return Task.CompletedTask;
        }

        public Task<IReadOnlyList<RuntimeIncidentSummary>> GetLatestSummariesAsync(int take, CancellationToken cancellationToken)
            => Task.FromResult<IReadOnlyList<RuntimeIncidentSummary>>([]);

        public Task<IReadOnlyList<RuntimeToolHealthSnapshot>> GetToolHealthAsync(CancellationToken cancellationToken)
            => Task.FromResult(ToolHealth);
    }
}
