using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public interface IAiCapabilityFactoryService
{
    Task<AiCapabilityFactoryDashboard> GetDashboardAsync(int take, CancellationToken cancellationToken);
    Task<AiToolGenerationDraftRecord> CreateDraftAsync(AiDraftGenerationRequest request, CancellationToken cancellationToken);
    Task<AiGenerationValidationReportRecord> ValidateDraftAsync(Guid draftId, string correlationId, string tenantId, CancellationToken cancellationToken);
    Task<AiGenerationDecisionRecord> RecordGovernanceDecisionAsync(Guid draftId, AiGenerationDecisionRequest request, CancellationToken cancellationToken);
    Task<AiGenerationSandboxReportRecord> RunSandboxAsync(Guid draftId, string correlationId, string tenantId, CancellationToken cancellationToken);
    Task<AiGenerationDecisionRecord> RecordOperatorApprovalAsync(Guid draftId, AiGenerationDecisionRequest request, CancellationToken cancellationToken);
    Task<AiGenerationDecisionRecord> ActivateAsync(Guid draftId, AiGenerationDecisionRequest request, CancellationToken cancellationToken);
}
