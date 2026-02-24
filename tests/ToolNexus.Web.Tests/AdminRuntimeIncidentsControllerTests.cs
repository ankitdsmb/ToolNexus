using System.Threading;
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
    public void Post_ReturnsOkAndForwardsIncidents()
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

        var result = controller.Post(new RuntimeIncidentIngestBatch([
            new RuntimeIncidentIngestRequest("json-formatter", "execute", "runtime_error", "failed", "stack", "json", DateTime.UtcNow, 1, "f")
        ]), CancellationToken.None);

        Assert.IsType<OkObjectResult>(result);

        var deadline = DateTime.UtcNow.AddSeconds(1);
        while (service.LastBatch is null && DateTime.UtcNow < deadline)
        {
            Thread.Sleep(10);
        }

        Assert.Equal("trace-123", service.LastBatch!.Incidents[0].CorrelationId);
    }

    private sealed class StubRuntimeIncidentService : IRuntimeIncidentService
    {
        public RuntimeIncidentIngestBatch? LastBatch { get; private set; }

        public Task IngestAsync(RuntimeIncidentIngestBatch batch, CancellationToken cancellationToken)
        {
            LastBatch = batch;
            return Task.CompletedTask;
        }

        public Task<IReadOnlyList<RuntimeIncidentSummary>> GetLatestSummariesAsync(int take, CancellationToken cancellationToken)
            => Task.FromResult<IReadOnlyList<RuntimeIncidentSummary>>([]);

        public Task<IReadOnlyList<RuntimeToolHealthSnapshot>> GetToolHealthAsync(CancellationToken cancellationToken)
            => Task.FromResult<IReadOnlyList<RuntimeToolHealthSnapshot>>([]);
    }
}
