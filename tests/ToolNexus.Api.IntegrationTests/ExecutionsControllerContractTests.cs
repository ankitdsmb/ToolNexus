using Microsoft.AspNetCore.Mvc;
using ToolNexus.Api.Controllers.Admin;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using Xunit;

namespace ToolNexus.Api.IntegrationTests;

public sealed class ExecutionsControllerContractTests
{
    [Fact]
    public async Task GetExecutions_ReturnsOkContract()
    {
        var controller = new ExecutionsController(new StubService());
        var response = await controller.GetExecutions(cancellationToken: CancellationToken.None);
        var ok = Assert.IsType<OkObjectResult>(response.Result);
        var payload = Assert.IsType<ExecutionLedgerPage>(ok.Value);
        Assert.Single(payload.Items);
    }

    [Fact]
    public async Task GetSnapshot_ReturnsNotFound_WhenMissing()
    {
        var controller = new ExecutionsController(new StubService());
        var response = await controller.GetSnapshot(Guid.NewGuid(), CancellationToken.None);
        Assert.IsType<NotFoundResult>(response.Result);
    }

    private sealed class StubService : IExecutionLedgerService
    {
        public Task<ExecutionLedgerPage> GetExecutionsAsync(ExecutionLedgerQuery query, CancellationToken cancellationToken)
            => Task.FromResult(new ExecutionLedgerPage(1, 50, 1, [new ExecutionLedgerSummary(Guid.NewGuid(), "json", DateTime.UtcNow, true, "LegacyAuthoritative", null, null, "trace", "ok", true, false, 0)]));

        public Task<ExecutionLedgerDetail?> GetExecutionByIdAsync(Guid id, CancellationToken cancellationToken)
            => Task.FromResult<ExecutionLedgerDetail?>(null);

        public Task<ExecutionLedgerSnapshot?> GetSnapshotByExecutionIdAsync(Guid id, CancellationToken cancellationToken)
            => Task.FromResult<ExecutionLedgerSnapshot?>(null);
    }
}
