using Microsoft.AspNetCore.Mvc;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Web.Areas.Admin.Controllers.Api;
using Xunit;

namespace ToolNexus.Web.Tests;

public sealed class GovernanceDecisionsApiControllerTests
{
    [Fact]
    public async Task GetDecisions_ReturnsServicePage()
    {
        var service = new StubGovernanceDecisionService();
        var controller = new GovernanceDecisionsController(service);

        var result = await controller.GetDecisions(page: 2, pageSize: 25, toolId: "json-formatter", cancellationToken: CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var payload = Assert.IsType<GovernanceDecisionPage>(ok.Value);
        Assert.Equal(2, payload.Page);
        Assert.Equal(25, service.LastQuery?.PageSize);
        Assert.Equal("json-formatter", service.LastQuery?.ToolId);
    }

    private sealed class StubGovernanceDecisionService : IGovernanceDecisionService
    {
        public GovernanceDecisionQuery? LastQuery { get; private set; }

        public Task<GovernanceDecisionPage> GetDecisionsAsync(GovernanceDecisionQuery query, CancellationToken cancellationToken)
        {
            LastQuery = query;
            return Task.FromResult(new GovernanceDecisionPage(query.Page, query.PageSize, 0, []));
        }

        public Task<GovernanceDecisionRecord?> GetByIdAsync(Guid decisionId, CancellationToken cancellationToken)
            => Task.FromResult<GovernanceDecisionRecord?>(null);
    }
}
