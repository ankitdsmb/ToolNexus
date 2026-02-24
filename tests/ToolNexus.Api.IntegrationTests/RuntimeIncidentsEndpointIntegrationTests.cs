using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;
using ToolNexus.Api.Controllers.Admin;
using ToolNexus.Api.Logging;
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
        var controller = new RuntimeIncidentsController(service, NullLogger<RuntimeIncidentsController>.Instance);

        var result = await controller.Post(new RuntimeIncidentIngestBatch([
            new RuntimeIncidentIngestRequest("json-formatter", "execute", "contract_violation", "legacy mismatch", "warning", null, "html_element", DateTime.UtcNow, 1, "f1")
        ]), CancellationToken.None);

        Assert.IsType<OkObjectResult>(result);
        Assert.Single(service.Ingested);
    }

    [Fact]
    public async Task PostIncident_UsesRequestCorrelationId()
    {
        var service = new StubRuntimeIncidentService();
        var controller = new RuntimeIncidentsController(service, NullLogger<RuntimeIncidentsController>.Instance)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext()
            }
        };
        controller.HttpContext.Request.Headers["X-Correlation-ID"] = "corr-123";

        await controller.Post(new RuntimeIncidentIngestBatch([
            new RuntimeIncidentIngestRequest("json-formatter", "execute", "runtime_error", "legacy mismatch", "critical", null, "html_element", DateTime.UtcNow, 1, "f1")
        ]), CancellationToken.None);

        Assert.Equal("corr-123", service.Ingested[0].Incidents[0].CorrelationId);
    }


    [Fact]
    public async Task GetIncidents_WithoutQueryParams_ReturnsOkWithDefaultTake()
    {
        var service = new StubRuntimeIncidentService();
        var controller = new RuntimeIncidentsController(service, NullLogger<RuntimeIncidentsController>.Instance);

        var result = await controller.Get(null, CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.IsAssignableFrom<IReadOnlyList<RuntimeIncidentSummary>>(ok.Value);
        Assert.Equal(100, service.LastTake);
    }

    [Fact]
    public async Task GetIncidents_WithEmptyTakeEquivalent_ReturnsOkWithDefaultTake()
    {
        var service = new StubRuntimeIncidentService();
        var controller = new RuntimeIncidentsController(service, NullLogger<RuntimeIncidentsController>.Instance);

        var result = await controller.Get(0, CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.IsAssignableFrom<IReadOnlyList<RuntimeIncidentSummary>>(ok.Value);
        Assert.Equal(100, service.LastTake);
    }

    [Fact]
    public async Task PostClientLogs_InvalidLevel_ReturnsBadRequest()
    {
        var service = new StubRuntimeIncidentService();
        var runtimeLogger = new StubRuntimeClientLoggerService();
        var controller = new RuntimeIncidentsController(service, NullLogger<RuntimeIncidentsController>.Instance, runtimeLogger);

        var result = await controller.PostClientLogs(new ClientIncidentLogBatch([
            new ClientIncidentLogRequest(
                "runtime.runtime",
                "fatal",
                "Unsupported level",
                null,
                "json-formatter",
                "corr-123",
                DateTime.UtcNow,
                null)
        ]), CancellationToken.None);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Empty(runtimeLogger.Batches);
    }

    [Fact]
    public async Task GetIncidents_WithValidTake_ReturnsData()
    {
        var service = new StubRuntimeIncidentService
        {
            Summaries = [new RuntimeIncidentSummary("json-formatter", "runtime incident", "critical", 2, DateTime.UtcNow)]
        };
        var controller = new RuntimeIncidentsController(service, NullLogger<RuntimeIncidentsController>.Instance);

        var result = await controller.Get(25, CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var payload = Assert.IsAssignableFrom<IReadOnlyList<RuntimeIncidentSummary>>(ok.Value);
        Assert.Single(payload);
        Assert.Equal(25, service.LastTake);
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

        var controller = new RuntimeIncidentsController(service, NullLogger<RuntimeIncidentsController>.Instance);

        var result = await controller.GetToolHealth(CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var payload = Assert.IsAssignableFrom<IReadOnlyList<RuntimeToolHealthSnapshot>>(ok.Value);
        Assert.Single(payload);
        Assert.Equal("json-formatter", payload[0].Slug);
    }

    [Fact]
    public async Task PostClientLogs_AcceptsStructuredMetadata()
    {
        var service = new StubRuntimeIncidentService();
        var runtimeLogger = new StubRuntimeClientLoggerService();
        var controller = new RuntimeIncidentsController(service, NullLogger<RuntimeIncidentsController>.Instance, runtimeLogger);

        var result = await controller.PostClientLogs(new ClientIncidentLogBatch([
            new ClientIncidentLogRequest(
                "runtime.runtime",
                "info",
                "Structured payload",
                null,
                "json-formatter",
                "corr-123",
                DateTime.UtcNow,
                new Dictionary<string, object?>
                {
                    ["attempt"] = 2,
                    ["success"] = true,
                    ["details"] = new Dictionary<string, object?> { ["phase"] = "mount" }
                })
        ]), CancellationToken.None);

        Assert.IsType<AcceptedResult>(result);
        Assert.Single(runtimeLogger.Batches);
        Assert.True(runtimeLogger.Batches[0].Logs[0].Metadata?.ContainsKey("details"));
    }

    private sealed class StubRuntimeIncidentService : IRuntimeIncidentService
    {
        public List<RuntimeIncidentIngestBatch> Ingested { get; } = [];
        public IReadOnlyList<RuntimeToolHealthSnapshot> Health { get; set; } = [];
        public IReadOnlyList<RuntimeIncidentSummary> Summaries { get; set; } = [];
        public int LastTake { get; private set; }

        public Task IngestAsync(RuntimeIncidentIngestBatch batch, CancellationToken cancellationToken)
        {
            Ingested.Add(batch);
            return Task.CompletedTask;
        }

        public Task<IReadOnlyList<RuntimeIncidentSummary>> GetLatestSummariesAsync(int take, CancellationToken cancellationToken)
        {
            LastTake = take;
            return Task.FromResult(Summaries);
        }

        public Task<IReadOnlyList<RuntimeToolHealthSnapshot>> GetToolHealthAsync(CancellationToken cancellationToken)
            => Task.FromResult(Health);
    }

    private sealed class StubRuntimeClientLoggerService : IRuntimeClientLoggerService
    {
        public List<ClientIncidentLogBatch> Batches { get; } = [];

        public Task WriteBatchAsync(ClientIncidentLogBatch batch, CancellationToken cancellationToken)
        {
            Batches.Add(batch);
            return Task.CompletedTask;
        }
    }
}
