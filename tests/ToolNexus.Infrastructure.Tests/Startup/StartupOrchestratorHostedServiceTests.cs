using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using ToolNexus.Application.Services;
using ToolNexus.Infrastructure.Content;
using ToolNexus.Infrastructure.Options;
using Xunit;

namespace ToolNexus.Infrastructure.Tests.Startup;

public sealed class StartupOrchestratorHostedServiceTests
{
    [Fact]
    public async Task StartAsync_ExecutesPhasesInDeterministicOrder()
    {
        var calls = new List<string>();
        var service = new StartupOrchestratorHostedService(
            [
                new TestPhase("Runtime Initialization", 1, calls),
                new TestPhase("Database Initialization", 0, calls),
                new TestPhase("Startup Complete", 2, calls)
            ],
            Microsoft.Extensions.Options.Options.Create(new StartupDiagnosticsOptions { Enabled = false }),
            NullLogger<StartupOrchestratorHostedService>.Instance);

        await service.StartAsync(CancellationToken.None);

        Assert.Equal(["Database Initialization", "Runtime Initialization", "Startup Complete"], calls);
    }

    [Fact]
    public async Task StartAsync_DuplicateOrder_ThrowsDeterministically()
    {
        var service = new StartupOrchestratorHostedService(
            [
                new TestPhase("Database Initialization", 0),
                new TestPhase("Runtime Initialization", 0)
            ],
            Microsoft.Extensions.Options.Options.Create(new StartupDiagnosticsOptions { Enabled = false }),
            NullLogger<StartupOrchestratorHostedService>.Instance);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => service.StartAsync(CancellationToken.None));
        Assert.Contains("Startup phase ordering conflict detected", ex.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task StartAsync_CancellationRequested_StopsPipeline()
    {
        var calls = new List<string>();
        using var cts = new CancellationTokenSource();

        var service = new StartupOrchestratorHostedService(
            [
                new CancellingPhase(cts, calls),
                new TestPhase("Startup Complete", 2, calls)
            ],
            Microsoft.Extensions.Options.Options.Create(new StartupDiagnosticsOptions { Enabled = false }),
            NullLogger<StartupOrchestratorHostedService>.Instance);

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => service.StartAsync(cts.Token));
        Assert.Equal(["Database Initialization"], calls);
    }

    private sealed class TestPhase(string phaseName, int order, List<string>? calls = null) : IStartupPhaseService
    {
        public int Order => order;
        public string PhaseName => phaseName;

        public Task ExecuteAsync(CancellationToken cancellationToken)
        {
            cancellationToken.ThrowIfCancellationRequested();
            calls?.Add(phaseName);
            return Task.CompletedTask;
        }
    }

    private sealed class CancellingPhase(CancellationTokenSource cts, List<string> calls) : IStartupPhaseService
    {
        public int Order => 0;
        public string PhaseName => "Database Initialization";

        public Task ExecuteAsync(CancellationToken cancellationToken)
        {
            calls.Add(PhaseName);
            cts.Cancel();
            cancellationToken.ThrowIfCancellationRequested();
            return Task.CompletedTask;
        }
    }
}
