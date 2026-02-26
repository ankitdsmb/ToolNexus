using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public interface IAiCapabilityFactoryRepository
{
    Task<IReadOnlyList<AiGenerationSignalRecord>> GetSignalsAsync(int take, CancellationToken cancellationToken);
    Task<AiToolGenerationDraftRecord> CreateDraftAsync(AiDraftGenerationRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyList<AiToolGenerationDraftRecord>> GetDraftQueueAsync(int take, CancellationToken cancellationToken);
    Task<AiGenerationValidationReportRecord> AddValidationReportAsync(Guid draftId, string correlationId, string tenantId, CancellationToken cancellationToken);
    Task<AiGenerationSandboxReportRecord> AddSandboxReportAsync(Guid draftId, string correlationId, string tenantId, CancellationToken cancellationToken);
    Task<AiGenerationDecisionRecord> AddDecisionAsync(Guid draftId, AiGenerationDecisionRequest request, string telemetryEventName, CancellationToken cancellationToken);
    Task<AiToolGenerationDraftRecord?> GetDraftByIdAsync(Guid draftId, CancellationToken cancellationToken);
    Task<IReadOnlyList<AiGenerationValidationReportRecord>> GetValidationReportsAsync(int take, CancellationToken cancellationToken);
    Task<IReadOnlyList<AiGenerationSandboxReportRecord>> GetSandboxReportsAsync(int take, CancellationToken cancellationToken);
    Task<IReadOnlyList<AiGenerationDecisionRecord>> GetDecisionsAsync(int take, CancellationToken cancellationToken);
}
