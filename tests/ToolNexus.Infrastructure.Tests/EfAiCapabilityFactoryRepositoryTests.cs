using ToolNexus.Application.Models;
using ToolNexus.Infrastructure.Content;
using ToolNexus.Infrastructure.Content.Entities;
using Xunit;

namespace ToolNexus.Infrastructure.Tests;

public sealed class EfAiCapabilityFactoryRepositoryTests
{
    [Theory]
    [ClassData(typeof(ProviderTheoryData))]
    public async Task ValidateDraftAsync_FailsForbiddenOperationScanner(TestDatabaseProvider provider)
    {
        await using var db = await TestDatabaseInstance.CreateAsync(provider);
        await using var seed = db.CreateContext();
        var signalId = Guid.NewGuid();
        seed.AiGenerationSignals.Add(new AiGenerationSignalEntity
        {
            SignalId = signalId,
            Source = "manual",
            Frequency = 12,
            ImpactEstimate = 1.2m,
            SuggestedToolCategory = "transform",
            ConfidenceScore = 0.9m,
            CorrelationId = "corr-1",
            TenantId = "tenant-a"
        });
        await seed.SaveChangesAsync();

        var repository = new EfAiCapabilityFactoryRepository(seed);
        var draft = await repository.CreateDraftAsync(new AiDraftGenerationRequest(
            signalId,
            "danger-tool",
            "{\"execution\":\"system.shell\"}",
            "{\"type\":\"object\"}",
            "{\"type\":\"object\"}",
            "{\"layout\":\"compact\"}",
            "A useful SEO description with enough detail.",
            "example",
            "note",
            "utility",
            "python",
            "low",
            88,
            "Low",
            "corr-1",
            "tenant-a"), CancellationToken.None);

        var report = await repository.AddValidationReportAsync(draft.DraftId, "corr-1", "tenant-a", CancellationToken.None);

        Assert.False(report.Passed);
        Assert.False(report.ForbiddenOperationScannerPassed);
    }

    [Theory]
    [ClassData(typeof(ProviderTheoryData))]
    public async Task DraftLifecycle_GovernanceToActivation_UpdatesStatus(TestDatabaseProvider provider)
    {
        await using var db = await TestDatabaseInstance.CreateAsync(provider);
        await using var context = db.CreateContext();
        var signalId = Guid.NewGuid();
        context.AiGenerationSignals.Add(new AiGenerationSignalEntity
        {
            SignalId = signalId,
            Source = "analytics",
            Frequency = 42,
            ImpactEstimate = 7.5m,
            SuggestedToolCategory = "governance",
            ConfidenceScore = 0.95m,
            CorrelationId = "corr-2",
            TenantId = "tenant-b"
        });
        await context.SaveChangesAsync();

        var repository = new EfAiCapabilityFactoryRepository(context);
        var draft = await repository.CreateDraftAsync(new AiDraftGenerationRequest(
            signalId,
            "safe-tool",
            "{\"execution\":\"sandbox\"}",
            "{\"type\":\"object\"}",
            "{\"type\":\"object\"}",
            "{\"layout\":\"compact\"}",
            "A useful SEO description with enough detail.",
            "example",
            "note",
            "utility",
            "dotnet",
            "low",
            93,
            "Low",
            "corr-2",
            "tenant-b"), CancellationToken.None);

        await repository.AddValidationReportAsync(draft.DraftId, "corr-2", "tenant-b", CancellationToken.None);
        await repository.AddDecisionAsync(draft.DraftId, new AiGenerationDecisionRequest("operator", AiGenerationDecisionAction.Approve, "Looks good", "corr-2", "tenant-b", "gov-1"), "ai.tool.approved", CancellationToken.None);
        await repository.AddSandboxReportAsync(draft.DraftId, "corr-2", "tenant-b", CancellationToken.None);
        await repository.AddDecisionAsync(draft.DraftId, new AiGenerationDecisionRequest("operator", AiGenerationDecisionAction.Approve, "Activate", "corr-2", "tenant-b", "gov-1"), "ai.tool.activated", CancellationToken.None);

        var updated = await repository.GetDraftByIdAsync(draft.DraftId, CancellationToken.None);
        Assert.NotNull(updated);
        Assert.Equal(AiGenerationDraftStatus.Active, updated!.Status);
    }
}
