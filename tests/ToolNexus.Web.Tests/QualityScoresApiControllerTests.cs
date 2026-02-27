using Microsoft.AspNetCore.Mvc;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Web.Areas.Admin.Controllers.Api;
using Xunit;

namespace ToolNexus.Web.Tests;

public sealed class QualityScoresApiControllerTests
{
    [Fact]
    public async Task GetScores_ReturnsServiceDashboard()
    {
        var service = new StubToolQualityScoreService();
        var controller = new QualityScoresController(service);

        var result = await controller.GetScores(limit: 40, toolId: "json-validator", cancellationToken: CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var payload = Assert.IsType<ToolQualityScoreDashboard>(ok.Value);
        Assert.Single(payload.Items);
        Assert.Equal(40, service.LastQuery?.Limit);
        Assert.Equal("json-validator", service.LastQuery?.ToolId);
    }

    private sealed class StubToolQualityScoreService : IToolQualityScoreService
    {
        public ToolQualityScoreQuery? LastQuery { get; private set; }

        public Task<ToolQualityScoreDashboard> GetDashboardAsync(ToolQualityScoreQuery query, CancellationToken cancellationToken)
        {
            LastQuery = query;
            var item = new ToolQualityScoreRecord("json-validator", 95.5m, 94m, 93m, 96m, DateTime.UtcNow);
            return Task.FromResult(new ToolQualityScoreDashboard([item], [item]));
        }
    }
}
