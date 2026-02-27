using Microsoft.AspNetCore.Mvc;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Web.Areas.Admin.Controllers.Api;
using Xunit;

namespace ToolNexus.Web.Tests;

public sealed class AdminExecutionLedgerControllerTests
{
    [Fact]
    public async Task GetExecutions_ReturnsOkPayload()
    {
        var expected = new ExecutionLedgerPage(1, 50, 1,
        [
            new ExecutionLedgerSummary(
                Guid.NewGuid(),
                "json-toolkit-pro",
                DateTime.UtcNow,
                true,
                "UnifiedAuthoritative",
                "corr-123",
                "tenant-a",
                "trace-123",
                "Conformant",
                true,
                false,
                0)
        ]);

        var controller = new ExecutionsController(new StubExecutionLedgerService(page: expected));

        var result = await controller.GetExecutions(cancellationToken: CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Same(expected, ok.Value);
    }

    [Fact]
    public async Task GetExecution_WhenNotFound_ReturnsNotFound()
    {
        var controller = new ExecutionsController(new StubExecutionLedgerService(detail: null));

        var result = await controller.GetExecution(Guid.NewGuid(), CancellationToken.None);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task GetExecution_WhenFound_ReturnsOkPayload()
    {
        var runtimeIdentity = new RuntimeIdentity("auto", "adapter-1", "worker-a", false, "LegacyAuthoritative");
        var snapshot = new ExecutionLedgerSnapshot("snap-1", "LegacyAuthoritative", "dotnet", "format.json", "corr-789", "tenant-z", DateTime.UtcNow, "v1", "{}", Guid.NewGuid());
        var conformance = new ExecutionLedgerConformance(true, "Conformant", false, 0, "[]");
        var authority = new ExecutionLedgerAuthorityDecision("LegacyAuthoritative", true, "policy-allow", "resolver");
        var expected = new ExecutionLedgerDetail(
            Guid.NewGuid(),
            "json-toolkit-pro",
            DateTime.UtcNow,
            true,
            120,
            null,
            64,
            "auto",
            "dotnet",
            "adapter-1",
            "resolved",
            "format.json",
            "LegacyAuthoritative",
            false,
            "corr-789",
            "tenant-z",
            "trace-789",
            runtimeIdentity,
            snapshot,
            conformance,
            authority);

        var controller = new ExecutionsController(new StubExecutionLedgerService(detail: expected));

        var result = await controller.GetExecution(expected.Id, CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Same(expected, ok.Value);
    }

    [Fact]
    public async Task GetSnapshot_WhenNotFound_ReturnsNotFound()
    {
        var controller = new ExecutionsController(new StubExecutionLedgerService(snapshot: null));

        var result = await controller.GetSnapshot(Guid.NewGuid(), CancellationToken.None);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task GetSnapshot_WhenFound_ReturnsOkPayload()
    {
        var expected = new ExecutionLedgerSnapshot(
            "snap-1",
            "UnifiedAuthoritative",
            "dotnet",
            "format.json",
            "corr-111",
            "tenant-1",
            DateTime.UtcNow,
            "v1",
            "{}",
            Guid.NewGuid());

        var controller = new ExecutionsController(new StubExecutionLedgerService(snapshot: expected));

        var result = await controller.GetSnapshot(Guid.NewGuid(), CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Same(expected, ok.Value);
    }

    private sealed class StubExecutionLedgerService(
        ExecutionLedgerPage? page = null,
        ExecutionLedgerDetail? detail = null,
        ExecutionLedgerSnapshot? snapshot = null) : IExecutionLedgerService
    {
        public Task<ExecutionLedgerPage> GetExecutionsAsync(ExecutionLedgerQuery query, CancellationToken cancellationToken)
            => Task.FromResult(page ?? new ExecutionLedgerPage(query.Page, query.PageSize, 0, []));

        public Task<ExecutionLedgerDetail?> GetExecutionByIdAsync(Guid id, CancellationToken cancellationToken)
            => Task.FromResult(detail);

        public Task<ExecutionLedgerSnapshot?> GetSnapshotByExecutionIdAsync(Guid id, CancellationToken cancellationToken)
            => Task.FromResult(snapshot);
    }
}
