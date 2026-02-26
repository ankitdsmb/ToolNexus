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
        var controller = new ExecutionMonitoringController(new StubService(health: expected), new StubControlPlaneService(), new StubAutonomousInsightsService(), NullLogger<ExecutionMonitoringController>.Instance);

        var action = await controller.GetHealth(CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(action.Result);
        Assert.Same(expected, ok.Value);
    }

    [Fact]
    public async Task GetExecutionStream_ReturnsOkPayload()
    {
        var expected = new List<ExecutionStreamItem> { new(Guid.NewGuid(), "json", "unified", "auto", "dotnet:auto", "admitted", "success", 24, DateTime.UtcNow) };
        var controller = new ExecutionMonitoringController(new StubService(stream: expected), new StubControlPlaneService(), new StubAutonomousInsightsService(), NullLogger<ExecutionMonitoringController>.Instance);

        var action = await controller.GetExecutionStream(10, CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(action.Result);
        Assert.Same(expected, ok.Value);
    }


    [Fact]
    public async Task GetAutonomousInsights_ReturnsOkPayload()
    {
        var controller = new ExecutionMonitoringController(new StubService(), new StubControlPlaneService(), new StubAutonomousInsightsService(), NullLogger<ExecutionMonitoringController>.Instance);
        var action = await controller.GetAutonomousInsights(10, CancellationToken.None);
        var ok = Assert.IsType<OkObjectResult>(action.Result);
        Assert.IsType<AutonomousInsightsPanel>(ok.Value);
    }

    [Fact]
    public async Task ResetCaches_ReturnsOperationPayload()
    {
        var controller = new ExecutionMonitoringController(new StubService(), new StubControlPlaneService(), new StubAutonomousInsightsService(), NullLogger<ExecutionMonitoringController>.Instance);
        var action = await controller.ResetCaches(new OperatorCommandRequest("incident", "runtime", "operator", null, "manual rollback"), CancellationToken.None);
        var ok = Assert.IsType<OkObjectResult>(action.Result);
        Assert.IsType<AdminControlPlaneOperationResult>(ok.Value);
    }

    private sealed class StubControlPlaneService : IAdminControlPlaneService
    {
        public Task<AdminControlPlaneOperationResult> ResetCachesAsync(OperatorCommandRequest commandRequest, CancellationToken cancellationToken)
            => Task.FromResult(new AdminControlPlaneOperationResult("cache_reset", "success", "ok", 0, "c1", commandRequest.ImpactScope, commandRequest.AuthorityContext, commandRequest.RollbackPlan));

        public Task<AdminControlPlaneOperationResult> DrainAuditQueueAsync(OperatorCommandRequest commandRequest, CancellationToken cancellationToken)
            => Task.FromResult(new AdminControlPlaneOperationResult("queue_drain", "success", "ok", 1, "c1", commandRequest.ImpactScope, commandRequest.AuthorityContext, commandRequest.RollbackPlan));

        public Task<AdminControlPlaneOperationResult> ReplayAuditDeadLettersAsync(OperatorCommandRequest commandRequest, CancellationToken cancellationToken)
            => Task.FromResult(new AdminControlPlaneOperationResult("queue_replay", "success", "ok", 1, "c1", commandRequest.ImpactScope, commandRequest.AuthorityContext, commandRequest.RollbackPlan));
    }



    private sealed class StubAutonomousInsightsService : IAutonomousInsightsService
    {
        public Task<AutonomousInsightsPanel> GetPanelAsync(int take, CancellationToken cancellationToken)
            => Task.FromResult(new AutonomousInsightsPanel([]));

        public Task<bool> ApproveAsync(Guid insightId, AutonomousInsightDecisionRequest request, CancellationToken cancellationToken)
            => Task.FromResult(true);

        public Task<bool> RejectAsync(Guid insightId, AutonomousInsightDecisionRequest request, CancellationToken cancellationToken)
            => Task.FromResult(true);
    }
    private sealed class StubService(
        ExecutionHealthSummary? health = null,
        ExecutionWorkersResponse? workers = null,
        ExecutionIncidentPage? incidents = null,
        IReadOnlyList<ExecutionStreamItem>? stream = null) : IAdminExecutionMonitoringService
    {
        public Task<ExecutionHealthSummary> GetHealthAsync(CancellationToken cancellationToken)
            => Task.FromResult(health ?? new ExecutionHealthSummary(0, 0, 0, null, false, false));

        public Task<ExecutionWorkersResponse> GetWorkersAsync(CancellationToken cancellationToken)
            => Task.FromResult(workers ?? new ExecutionWorkersResponse([]));

        public Task<ExecutionIncidentPage> GetIncidentsAsync(int page, int pageSize, CancellationToken cancellationToken)
            => Task.FromResult(incidents ?? new ExecutionIncidentPage(page, pageSize, 0, []));

        public Task<IReadOnlyList<ExecutionStreamItem>> GetExecutionStreamAsync(int take, CancellationToken cancellationToken)
            => Task.FromResult(stream ?? []);

        public Task<GovernanceVisibilitySummary> GetGovernanceVisibilityAsync(CancellationToken cancellationToken)
            => Task.FromResult(new GovernanceVisibilitySummary(0, 0, 0, new Dictionary<string, int>()));

        public Task<CapabilityLifecycleSummary> GetCapabilityLifecycleAsync(CancellationToken cancellationToken)
            => Task.FromResult(new CapabilityLifecycleSummary(0, 0, 0, 0, 0));

        public Task<QualityIntelligenceSummary> GetQualityIntelligenceAsync(CancellationToken cancellationToken)
            => Task.FromResult(new QualityIntelligenceSummary(0, 0, 0, 0));

        public async Task<OperatorCommandCenterSnapshot> GetCommandCenterSnapshotAsync(int incidentPage, int incidentPageSize, int streamTake, CancellationToken cancellationToken)
            => new(await GetHealthAsync(cancellationToken), await GetWorkersAsync(cancellationToken), await GetIncidentsAsync(incidentPage, incidentPageSize, cancellationToken), await GetExecutionStreamAsync(streamTake, cancellationToken), await GetGovernanceVisibilityAsync(cancellationToken), await GetCapabilityLifecycleAsync(cancellationToken), await GetQualityIntelligenceAsync(cancellationToken));
    }
}
