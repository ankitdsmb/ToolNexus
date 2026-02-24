using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using Xunit;

namespace ToolNexus.Application.Tests;

public sealed class RuntimeIncidentServiceTests
{
    [Fact]
    public async Task IngestAsync_NormalizesIncidentFields()
    {
        var repo = new StubRepository();
        var service = new RuntimeIncidentService(repo);

        await service.IngestAsync(new RuntimeIncidentIngestBatch([
            new RuntimeIncidentIngestRequest(" Json-Formatter ", "bad", "bad", "Error", "critical", "stack", "", default, 999, "f1", " corr-id ")
        ]), CancellationToken.None);

        var incident = Assert.Single(repo.Incidents);
        Assert.Equal("json-formatter", incident.ToolSlug);
        Assert.Equal("execute", incident.Phase);
        Assert.Equal("runtime_error", incident.ErrorType);
        Assert.Equal("unknown", incident.PayloadType);
        Assert.Equal(500, incident.Count);
        Assert.Equal("corr-id", incident.CorrelationId);
    }


    [Fact]
    public async Task IngestAsync_DoesNotThrow_WhenRepositoryFails()
    {
        var service = new RuntimeIncidentService(new ThrowingRepository());

        var ex = await Record.ExceptionAsync(() => service.IngestAsync(new RuntimeIncidentIngestBatch([
            new RuntimeIncidentIngestRequest("tool", "execute", "runtime_error", "message", "critical", null, "json", DateTime.UtcNow, 1, "f")
        ]), CancellationToken.None));

        Assert.Null(ex);
    }

    [Fact]
    public async Task IngestAsync_SkipsInvalidIncidents()
    {
        var repo = new StubRepository();
        var service = new RuntimeIncidentService(repo);

        await service.IngestAsync(new RuntimeIncidentIngestBatch([
            new RuntimeIncidentIngestRequest("", "execute", "runtime_error", "message", "critical", null, "json", DateTime.UtcNow, 1, "f1"),
            new RuntimeIncidentIngestRequest("tool", "execute", "runtime_error", "", "critical", null, "json", DateTime.UtcNow, 1, "f2")
        ]), CancellationToken.None);

        Assert.Empty(repo.Incidents);
    }

    private sealed class ThrowingRepository : IRuntimeIncidentRepository
    {
        public Task UpsertAsync(RuntimeIncidentIngestRequest incident, CancellationToken cancellationToken)
            => throw new InvalidOperationException("db unavailable");

        public Task<IReadOnlyList<RuntimeIncidentSummary>> GetLatestSummariesAsync(int take, CancellationToken cancellationToken)
            => Task.FromResult<IReadOnlyList<RuntimeIncidentSummary>>([]);

        public Task<IReadOnlyList<RuntimeToolHealthSnapshot>> GetToolHealthAsync(CancellationToken cancellationToken)
            => Task.FromResult<IReadOnlyList<RuntimeToolHealthSnapshot>>([]);
    }

    private sealed class StubRepository : IRuntimeIncidentRepository
    {
        public List<RuntimeIncidentIngestRequest> Incidents { get; } = [];

        public Task UpsertAsync(RuntimeIncidentIngestRequest incident, CancellationToken cancellationToken)
        {
            Incidents.Add(incident);
            return Task.CompletedTask;
        }

        public Task<IReadOnlyList<RuntimeIncidentSummary>> GetLatestSummariesAsync(int take, CancellationToken cancellationToken)
            => Task.FromResult<IReadOnlyList<RuntimeIncidentSummary>>([]);

        public Task<IReadOnlyList<RuntimeToolHealthSnapshot>> GetToolHealthAsync(CancellationToken cancellationToken)
            => Task.FromResult<IReadOnlyList<RuntimeToolHealthSnapshot>>([]);
    }
}
