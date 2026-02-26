using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using Xunit;

namespace ToolNexus.Application.Tests;

public sealed class AiCapabilityFactoryServiceTests
{
    [Fact]
    public async Task RecordGovernanceDecision_Reject_EmitsRejectedTelemetryEvent()
    {
        var repo = new StubRepo();
        var service = new AiCapabilityFactoryService(repo);

        var decision = await service.RecordGovernanceDecisionAsync(Guid.NewGuid(), new AiGenerationDecisionRequest("op", AiGenerationDecisionAction.Reject, "unsafe", "corr", "tenant"), CancellationToken.None);

        Assert.Equal("ai.tool.rejected", decision.TelemetryEventName);
    }

    [Fact]
    public async Task Activate_UsesActivatedTelemetryEvent()
    {
        var repo = new StubRepo();
        var service = new AiCapabilityFactoryService(repo);

        var decision = await service.ActivateAsync(Guid.NewGuid(), new AiGenerationDecisionRequest("op", AiGenerationDecisionAction.Approve, "activate", "corr", "tenant"), CancellationToken.None);

        Assert.Equal("ai.tool.activated", decision.TelemetryEventName);
    }

    private sealed class StubRepo : IAiCapabilityFactoryRepository
    {
        public Task<AiGenerationValidationReportRecord> AddValidationReportAsync(Guid draftId, string correlationId, string tenantId, CancellationToken cancellationToken)
            => Task.FromResult(new AiGenerationValidationReportRecord(Guid.NewGuid(), draftId, true, true, true, true, true, true, true, "[]", correlationId, tenantId, DateTime.UtcNow));

        public Task<AiGenerationSandboxReportRecord> AddSandboxReportAsync(Guid draftId, string correlationId, string tenantId, CancellationToken cancellationToken)
            => Task.FromResult(new AiGenerationSandboxReportRecord(Guid.NewGuid(), draftId, true, "ok", "{}", "Compliant", correlationId, tenantId, DateTime.UtcNow));

        public Task<AiGenerationDecisionRecord> AddDecisionAsync(Guid draftId, AiGenerationDecisionRequest request, string telemetryEventName, CancellationToken cancellationToken)
            => Task.FromResult(new AiGenerationDecisionRecord(Guid.NewGuid(), draftId, request.OperatorId, request.Action, request.DecisionReason, telemetryEventName, request.GovernanceDecisionId ?? string.Empty, request.CorrelationId, request.TenantId, DateTime.UtcNow));

        public Task<AiToolGenerationDraftRecord> CreateDraftAsync(AiDraftGenerationRequest request, CancellationToken cancellationToken)
            => Task.FromResult(new AiToolGenerationDraftRecord(Guid.NewGuid(), request.SignalId, request.ToolSlug, request.ManifestJson, request.InputSchemaJson, request.OutputSchemaJson, request.UiSchemaJson, request.SeoContent, request.ExampleUsage, request.SafetyNotes, request.GeneratedCapabilityClass, request.SuggestedRuntimeLanguage, request.RequiredPermissions, request.DraftQualityScore, request.RiskLevel, AiGenerationDraftStatus.Draft, request.CorrelationId, request.TenantId, DateTime.UtcNow));

        public Task<IReadOnlyList<AiGenerationDecisionRecord>> GetDecisionsAsync(int take, CancellationToken cancellationToken) => Task.FromResult<IReadOnlyList<AiGenerationDecisionRecord>>([]);
        public Task<AiToolGenerationDraftRecord?> GetDraftByIdAsync(Guid draftId, CancellationToken cancellationToken) => Task.FromResult<AiToolGenerationDraftRecord?>(null);
        public Task<IReadOnlyList<AiToolGenerationDraftRecord>> GetDraftQueueAsync(int take, CancellationToken cancellationToken) => Task.FromResult<IReadOnlyList<AiToolGenerationDraftRecord>>([]);
        public Task<IReadOnlyList<AiGenerationSandboxReportRecord>> GetSandboxReportsAsync(int take, CancellationToken cancellationToken) => Task.FromResult<IReadOnlyList<AiGenerationSandboxReportRecord>>([]);
        public Task<IReadOnlyList<AiGenerationSignalRecord>> GetSignalsAsync(int take, CancellationToken cancellationToken) => Task.FromResult<IReadOnlyList<AiGenerationSignalRecord>>([]);
        public Task<IReadOnlyList<AiGenerationValidationReportRecord>> GetValidationReportsAsync(int take, CancellationToken cancellationToken) => Task.FromResult<IReadOnlyList<AiGenerationValidationReportRecord>>([]);
    }
}
