namespace ToolNexus.Admin.Services.AIGenerator;

public enum AiGeneratedToolStatus
{
    Draft = 1,
    Approved = 2,
    Rejected = 3,
    Published = 4
}

public sealed record AiGeneratedToolApprovalResult(
    Guid ToolId,
    AiGeneratedToolStatus Status,
    string ReviewedBy,
    DateTime ReviewedAtUtc,
    string? Notes,
    bool CertificationTriggered,
    bool RuntimeAvailable);

public interface IAiGeneratedToolRepository
{
    Task CreateDraftAsync(Guid toolId, string createdBy, DateTime createdAtUtc, CancellationToken cancellationToken = default);
    Task MarkApprovedAsync(Guid toolId, string reviewedBy, DateTime reviewedAtUtc, string? notes, CancellationToken cancellationToken = default);
    Task MarkRejectedAsync(Guid toolId, string reviewedBy, DateTime reviewedAtUtc, string? notes, CancellationToken cancellationToken = default);
    Task UpdateDraftAsync(Guid toolId, string reviewedBy, DateTime reviewedAtUtc, string changeSummary, CancellationToken cancellationToken = default);
    Task MarkPublishedAsync(Guid toolId, string reviewedBy, DateTime reviewedAtUtc, CancellationToken cancellationToken = default);
}

public interface IAiGeneratedToolCertificationPipeline
{
    Task RunAsync(Guid toolId, CancellationToken cancellationToken = default);
}

public interface IAiGeneratedToolPublisher
{
    Task PublishAsync(Guid toolId, CancellationToken cancellationToken = default);
}

public interface IAiToolApprovalService
{
    Task CreateDraftAsync(Guid toolId, string createdBy, CancellationToken cancellationToken = default);
    Task<AiGeneratedToolApprovalResult> ApproveAsync(Guid toolId, string reviewedBy, string? notes, CancellationToken cancellationToken = default);
    Task<AiGeneratedToolApprovalResult> RejectAsync(Guid toolId, string reviewedBy, string? notes, CancellationToken cancellationToken = default);
    Task<AiGeneratedToolApprovalResult> EditAsync(Guid toolId, string reviewedBy, string changeSummary, CancellationToken cancellationToken = default);
}

public sealed class AiToolApprovalService(
    IAiGeneratedToolRepository toolRepository,
    IAiGeneratedToolCertificationPipeline certificationPipeline,
    IAiGeneratedToolPublisher publisher,
    TimeProvider timeProvider) : IAiToolApprovalService
{
    public Task CreateDraftAsync(Guid toolId, string createdBy, CancellationToken cancellationToken = default)
    {
        ValidateToolId(toolId);

        if (string.IsNullOrWhiteSpace(createdBy))
        {
            throw new ArgumentException("Creator identity is required.", nameof(createdBy));
        }

        var createdAtUtc = timeProvider.GetUtcNow().UtcDateTime;
        return toolRepository.CreateDraftAsync(toolId, createdBy, createdAtUtc, cancellationToken);
    }

    public async Task<AiGeneratedToolApprovalResult> ApproveAsync(Guid toolId, string reviewedBy, string? notes, CancellationToken cancellationToken = default)
    {
        ValidateToolId(toolId);
        ValidateReviewer(reviewedBy);

        var reviewedAtUtc = timeProvider.GetUtcNow().UtcDateTime;

        await toolRepository.MarkApprovedAsync(toolId, reviewedBy, reviewedAtUtc, notes, cancellationToken).ConfigureAwait(false);

        // Rule: AI-generated tools must pass certification before runtime availability.
        await certificationPipeline.RunAsync(toolId, cancellationToken).ConfigureAwait(false);
        await publisher.PublishAsync(toolId, cancellationToken).ConfigureAwait(false);

        var publishedAtUtc = timeProvider.GetUtcNow().UtcDateTime;
        await toolRepository.MarkPublishedAsync(toolId, reviewedBy, publishedAtUtc, cancellationToken).ConfigureAwait(false);

        return new AiGeneratedToolApprovalResult(
            toolId,
            AiGeneratedToolStatus.Published,
            reviewedBy,
            publishedAtUtc,
            notes,
            CertificationTriggered: true,
            RuntimeAvailable: true);
    }

    public async Task<AiGeneratedToolApprovalResult> RejectAsync(Guid toolId, string reviewedBy, string? notes, CancellationToken cancellationToken = default)
    {
        ValidateToolId(toolId);
        ValidateReviewer(reviewedBy);

        var reviewedAtUtc = timeProvider.GetUtcNow().UtcDateTime;
        await toolRepository.MarkRejectedAsync(toolId, reviewedBy, reviewedAtUtc, notes, cancellationToken).ConfigureAwait(false);

        return new AiGeneratedToolApprovalResult(
            toolId,
            AiGeneratedToolStatus.Rejected,
            reviewedBy,
            reviewedAtUtc,
            notes,
            CertificationTriggered: false,
            RuntimeAvailable: false);
    }

    public async Task<AiGeneratedToolApprovalResult> EditAsync(Guid toolId, string reviewedBy, string changeSummary, CancellationToken cancellationToken = default)
    {
        ValidateToolId(toolId);
        ValidateReviewer(reviewedBy);

        if (string.IsNullOrWhiteSpace(changeSummary))
        {
            throw new ArgumentException("Change summary is required.", nameof(changeSummary));
        }

        var reviewedAtUtc = timeProvider.GetUtcNow().UtcDateTime;
        await toolRepository.UpdateDraftAsync(toolId, reviewedBy, reviewedAtUtc, changeSummary, cancellationToken).ConfigureAwait(false);

        return new AiGeneratedToolApprovalResult(
            toolId,
            AiGeneratedToolStatus.Draft,
            reviewedBy,
            reviewedAtUtc,
            changeSummary,
            CertificationTriggered: false,
            RuntimeAvailable: false);
    }

    private static void ValidateToolId(Guid toolId)
    {
        if (toolId == Guid.Empty)
        {
            throw new ArgumentException("Tool id is required.", nameof(toolId));
        }
    }

    private static void ValidateReviewer(string reviewedBy)
    {
        if (string.IsNullOrWhiteSpace(reviewedBy))
        {
            throw new ArgumentException("Reviewer identity is required.", nameof(reviewedBy));
        }
    }
}
