namespace ToolNexus.Admin.Services.Marketplace;

public interface IToolSubmissionRepository
{
    Task MarkApprovedAsync(Guid submissionId, string reviewedBy, DateTime reviewedAtUtc, string? reviewNotes, CancellationToken cancellationToken = default);
    Task MarkRejectedAsync(Guid submissionId, string reviewedBy, DateTime reviewedAtUtc, string? reviewNotes, CancellationToken cancellationToken = default);
    Task MarkChangesRequestedAsync(Guid submissionId, string reviewedBy, DateTime reviewedAtUtc, string? reviewNotes, CancellationToken cancellationToken = default);
}

public sealed class ToolModerationService(
    IToolSubmissionRepository submissionRepository,
    IToolCertificationPipeline certificationPipeline,
    IToolCertificateGenerator certificateGenerator,
    IProductionCatalogPublisher productionCatalogPublisher,
    TimeProvider timeProvider) : IToolModerationService
{
    public Task<ToolApprovalWorkflowResult> ApproveToolAsync(Guid submissionId, string reviewedBy, string? reviewNotes, CancellationToken cancellationToken = default)
        => ExecuteModerationAsync(submissionId, ToolModerationDecision.Approve, reviewedBy, reviewNotes, cancellationToken);

    public Task<ToolApprovalWorkflowResult> RejectToolAsync(Guid submissionId, string reviewedBy, string? reviewNotes, CancellationToken cancellationToken = default)
        => ExecuteModerationAsync(submissionId, ToolModerationDecision.Reject, reviewedBy, reviewNotes, cancellationToken);

    public Task<ToolApprovalWorkflowResult> RequestChangesAsync(Guid submissionId, string reviewedBy, string? reviewNotes, CancellationToken cancellationToken = default)
        => ExecuteModerationAsync(submissionId, ToolModerationDecision.RequestChanges, reviewedBy, reviewNotes, cancellationToken);

    private async Task<ToolApprovalWorkflowResult> ExecuteModerationAsync(
        Guid submissionId,
        ToolModerationDecision decision,
        string reviewedBy,
        string? reviewNotes,
        CancellationToken cancellationToken)
    {
        if (submissionId == Guid.Empty)
        {
            throw new ArgumentException("Submission id is required.", nameof(submissionId));
        }

        if (string.IsNullOrWhiteSpace(reviewedBy))
        {
            throw new ArgumentException("Reviewer identity is required.", nameof(reviewedBy));
        }

        var reviewedAtUtc = timeProvider.GetUtcNow().UtcDateTime;

        switch (decision)
        {
            case ToolModerationDecision.Approve:
                await submissionRepository.MarkApprovedAsync(submissionId, reviewedBy, reviewedAtUtc, reviewNotes, cancellationToken).ConfigureAwait(false);

                // Rule: Approval must trigger the certification pipeline.
                await certificationPipeline.RunAsync(submissionId, cancellationToken).ConfigureAwait(false);
                var certificateId = await certificateGenerator.GenerateAsync(submissionId, cancellationToken).ConfigureAwait(false);
                await productionCatalogPublisher.PublishAsync(submissionId, certificateId, cancellationToken).ConfigureAwait(false);

                return new ToolApprovalWorkflowResult(
                    submissionId,
                    decision,
                    reviewedBy,
                    reviewedAtUtc,
                    reviewNotes,
                    CertificationTriggered: true,
                    CertificateGenerated: true,
                    MovedToProductionCatalog: true);

            case ToolModerationDecision.Reject:
                await submissionRepository.MarkRejectedAsync(submissionId, reviewedBy, reviewedAtUtc, reviewNotes, cancellationToken).ConfigureAwait(false);
                return new ToolApprovalWorkflowResult(
                    submissionId,
                    decision,
                    reviewedBy,
                    reviewedAtUtc,
                    reviewNotes,
                    CertificationTriggered: false,
                    CertificateGenerated: false,
                    MovedToProductionCatalog: false);

            case ToolModerationDecision.RequestChanges:
                await submissionRepository.MarkChangesRequestedAsync(submissionId, reviewedBy, reviewedAtUtc, reviewNotes, cancellationToken).ConfigureAwait(false);
                return new ToolApprovalWorkflowResult(
                    submissionId,
                    decision,
                    reviewedBy,
                    reviewedAtUtc,
                    reviewNotes,
                    CertificationTriggered: false,
                    CertificateGenerated: false,
                    MovedToProductionCatalog: false);

            default:
                throw new ArgumentOutOfRangeException(nameof(decision), decision, "Unsupported moderation decision.");
        }
    }
}

public interface IToolModerationService
{
    Task<ToolApprovalWorkflowResult> ApproveToolAsync(Guid submissionId, string reviewedBy, string? reviewNotes, CancellationToken cancellationToken = default);
    Task<ToolApprovalWorkflowResult> RejectToolAsync(Guid submissionId, string reviewedBy, string? reviewNotes, CancellationToken cancellationToken = default);
    Task<ToolApprovalWorkflowResult> RequestChangesAsync(Guid submissionId, string reviewedBy, string? reviewNotes, CancellationToken cancellationToken = default);
}
