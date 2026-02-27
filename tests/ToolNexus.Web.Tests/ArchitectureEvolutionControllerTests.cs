using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Web.Areas.Admin.Controllers.Api;
using Xunit;

namespace ToolNexus.Web.Tests;

public sealed class ArchitectureEvolutionControllerTests
{
    [Fact]
    public async Task GetDashboard_ReturnsDashboardFromService()
    {
        var expected = new EvolutionDashboard([], [], [], [], []);
        var service = new StubArchitectureEvolutionService { Dashboard = expected };
        var controller = new ArchitectureEvolutionController(service, NullLogger<ArchitectureEvolutionController>.Instance);

        var result = await controller.GetDashboard(20, CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Same(expected, ok.Value);
    }

    private sealed class StubArchitectureEvolutionService : IArchitectureEvolutionService
    {
        public EvolutionDashboard Dashboard { get; set; } = new([], [], [], [], []);

        public Task<ArchitectureEvolutionSignal> IngestSignalAsync(EvolutionSignalIngestRequest request, CancellationToken cancellationToken)
            => Task.FromResult(new ArchitectureEvolutionSignal(Guid.NewGuid(), request.SignalType, request.SourceDomain, request.SeverityScore, request.CorrelationId, request.TenantId, request.RuntimeIdentity, request.DetectedAtUtc ?? DateTime.UtcNow, request.PayloadJson));

        public Task<int> RunDriftDetectionAsync(CancellationToken cancellationToken)
            => Task.FromResult(0);

        public Task<int> GenerateRecommendationsAsync(CancellationToken cancellationToken)
            => Task.FromResult(0);

        public Task<EvolutionDashboard> GetDashboardAsync(int limit, CancellationToken cancellationToken)
            => Task.FromResult(Dashboard);

        public Task<bool> RecordArchitectDecisionAsync(Guid recommendationId, ArchitectDecisionRequest request, CancellationToken cancellationToken)
            => Task.FromResult(true);
    }
}
