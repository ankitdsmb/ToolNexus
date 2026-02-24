using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Web.Areas.Admin.Controllers.Api;
using Xunit;

namespace ToolNexus.Web.Tests;

public sealed class AdminExecutionMonitoringControllerTests
{
    [Fact]
    public async Task GetHealth_ReturnsOkPayload()
    {
        var expected = new ExecutionHealthSummary(1, 2, 3, 4.5, true, true);
        var controller = new ExecutionMonitoringController(new StubService(health: expected), NullLogger<ExecutionMonitoringController>.Instance);

        var action = await controller.GetHealth(CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(action.Result);
        Assert.Same(expected, ok.Value);
    }

    [Fact]
    public async Task GetWorkers_ReturnsOkPayload()
    {
        var expected = new ExecutionWorkersResponse([
            new ExecutionWorkerStatus("worker-1", DateTime.UtcNow, 2, 1, false)
        ]);
        var controller = new ExecutionMonitoringController(new StubService(workers: expected), NullLogger<ExecutionMonitoringController>.Instance);

        var action = await controller.GetWorkers(CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(action.Result);
        Assert.Same(expected, ok.Value);
    }

    [Fact]
    public async Task GetIncidents_ReturnsOkPayload()
    {
        var expected = new ExecutionIncidentPage(2, 10, 22,
        [
            new ExecutionIncident("retry", "warning", "siem", DateTime.UtcNow, "retry", 1)
        ]);
        var controller = new ExecutionMonitoringController(new StubService(incidents: expected), NullLogger<ExecutionMonitoringController>.Instance);

        var action = await controller.GetIncidents(2, 10, CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(action.Result);
        Assert.Same(expected, ok.Value);
    }

    private sealed class StubService(
        ExecutionHealthSummary? health = null,
        ExecutionWorkersResponse? workers = null,
        ExecutionIncidentPage? incidents = null) : IAdminExecutionMonitoringService
    {
        public Task<ExecutionHealthSummary> GetHealthAsync(CancellationToken cancellationToken)
            => Task.FromResult(health ?? new ExecutionHealthSummary(0, 0, 0, null, false, false));

        public Task<ExecutionWorkersResponse> GetWorkersAsync(CancellationToken cancellationToken)
            => Task.FromResult(workers ?? new ExecutionWorkersResponse([]));

        public Task<ExecutionIncidentPage> GetIncidentsAsync(int page, int pageSize, CancellationToken cancellationToken)
            => Task.FromResult(incidents ?? new ExecutionIncidentPage(page, pageSize, 0, []));
    }
}
