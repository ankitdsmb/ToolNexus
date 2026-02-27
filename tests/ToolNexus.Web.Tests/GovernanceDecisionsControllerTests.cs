using Microsoft.AspNetCore.Mvc;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Web.Areas.Admin.Controllers.Api;
using Xunit;

namespace ToolNexus.Web.Tests;

public sealed class GovernanceDecisionsControllerTests
{
    [Fact]
    public async Task GetDecisions_ReturnsOkPayload()
    {
        var expected = new GovernanceDecisionPage(1, 50, 1,
        [
            new GovernanceDecisionRecord(
                Guid.NewGuid(),
                "json-toolkit-pro",
                "format.json",
                "UnifiedAuthoritative",
                "system",
                "policy allow",
                "v1",
                DateTime.UtcNow,
                GovernanceDecisionStatus.Approved)
        ]);

        var controller = new GovernanceDecisionsController(new StubService(page: expected));

        var result = await controller.GetDecisions(cancellationToken: CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Same(expected, ok.Value);
    }

    [Fact]
    public async Task GetDecision_WhenNotFound_ReturnsNotFound()
    {
        var controller = new GovernanceDecisionsController(new StubService(item: null));

        var result = await controller.GetDecision(Guid.NewGuid(), CancellationToken.None);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task GetDecision_WhenFound_ReturnsOkPayload()
    {
        var expected = new GovernanceDecisionRecord(
            Guid.NewGuid(),
            "text-intelligence",
            "analyze.text",
            "LegacyAuthoritative",
            "auditor",
            "manual override",
            "v2",
            DateTime.UtcNow,
            GovernanceDecisionStatus.Override);

        var controller = new GovernanceDecisionsController(new StubService(item: expected));

        var result = await controller.GetDecision(expected.DecisionId, CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Same(expected, ok.Value);
    }

    private sealed class StubService(GovernanceDecisionPage? page = null, GovernanceDecisionRecord? item = null) : IGovernanceDecisionService
    {
        public Task<GovernanceDecisionPage> GetDecisionsAsync(GovernanceDecisionQuery query, CancellationToken cancellationToken)
            => Task.FromResult(page ?? new GovernanceDecisionPage(query.Page, query.PageSize, 0, []));

        public Task<GovernanceDecisionRecord?> GetByIdAsync(Guid decisionId, CancellationToken cancellationToken)
            => Task.FromResult(item);
    }
}
