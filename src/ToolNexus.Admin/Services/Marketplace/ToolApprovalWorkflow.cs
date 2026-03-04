namespace ToolNexus.Admin.Services.Marketplace;

public enum ToolModerationDecision
{
    Approve = 1,
    Reject = 2,
    RequestChanges = 3
}

public sealed record ToolApprovalWorkflowResult(
    Guid SubmissionId,
    ToolModerationDecision Decision,
    string ReviewedBy,
    DateTime ReviewedAtUtc,
    string? ReviewNotes,
    bool CertificationTriggered,
    bool CertificateGenerated,
    bool MovedToProductionCatalog);

public interface IToolCertificationPipeline
{
    Task RunAsync(Guid submissionId, CancellationToken cancellationToken = default);
}

public interface IToolCertificateGenerator
{
    Task<string> GenerateAsync(Guid submissionId, CancellationToken cancellationToken = default);
}

public interface IProductionCatalogPublisher
{
    Task PublishAsync(Guid submissionId, string certificateId, CancellationToken cancellationToken = default);
}
