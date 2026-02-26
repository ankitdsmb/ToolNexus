using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public sealed class AiCapabilityFactoryService(IAiCapabilityFactoryRepository repository) : IAiCapabilityFactoryService
{
    public async Task<AiCapabilityFactoryDashboard> GetDashboardAsync(int take, CancellationToken cancellationToken)
    {
        var safeTake = Math.Clamp(take, 1, 200);
        var drafts = await repository.GetDraftQueueAsync(safeTake, cancellationToken);
        var validations = await repository.GetValidationReportsAsync(safeTake, cancellationToken);
        var sandboxes = await repository.GetSandboxReportsAsync(safeTake, cancellationToken);
        var decisions = await repository.GetDecisionsAsync(safeTake, cancellationToken);

        return new AiCapabilityFactoryDashboard(
            drafts,
            validations,
            sandboxes,
            decisions,
            drafts.Where(x => x.Status is AiGenerationDraftStatus.Active or AiGenerationDraftStatus.OperatorApproved)
                .OrderByDescending(x => x.CreatedAtUtc)
                .ToArray());
    }

    public Task<AiToolGenerationDraftRecord> CreateDraftAsync(AiDraftGenerationRequest request, CancellationToken cancellationToken)
        => repository.CreateDraftAsync(request, cancellationToken);

    public Task<AiGenerationValidationReportRecord> ValidateDraftAsync(Guid draftId, string correlationId, string tenantId, CancellationToken cancellationToken)
        => repository.AddValidationReportAsync(draftId, correlationId, tenantId, cancellationToken);

    public async Task<AiGenerationDecisionRecord> RecordGovernanceDecisionAsync(Guid draftId, AiGenerationDecisionRequest request, CancellationToken cancellationToken)
    {
        var eventName = request.Action switch
        {
            AiGenerationDecisionAction.Approve => "ai.tool.approved",
            AiGenerationDecisionAction.Reject => "ai.tool.rejected",
            _ => "ai.generation.requested"
        };

        return await repository.AddDecisionAsync(draftId, request, eventName, cancellationToken);
    }

    public Task<AiGenerationSandboxReportRecord> RunSandboxAsync(Guid draftId, string correlationId, string tenantId, CancellationToken cancellationToken)
        => repository.AddSandboxReportAsync(draftId, correlationId, tenantId, cancellationToken);

    public Task<AiGenerationDecisionRecord> RecordOperatorApprovalAsync(Guid draftId, AiGenerationDecisionRequest request, CancellationToken cancellationToken)
        => repository.AddDecisionAsync(draftId, request, "ai.tool.approved", cancellationToken);

    public Task<AiGenerationDecisionRecord> ActivateAsync(Guid draftId, AiGenerationDecisionRequest request, CancellationToken cancellationToken)
        => repository.AddDecisionAsync(draftId, request, "ai.tool.activated", cancellationToken);
}
