using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public interface IAiToolPackageRepository
{
    Task<bool> ExistsBySlugAsync(string slug, CancellationToken cancellationToken);
    Task<AiToolPackageRecord> CreateAsync(AiToolPackageContract contract, string correlationId, string tenantId, CancellationToken cancellationToken);
    Task<AiToolPackageRecord?> GetBySlugAsync(string slug, CancellationToken cancellationToken);
    Task<AiToolPackageRecord> UpdateAsync(Guid id, string jsonPayload, int expectedVersion, string correlationId, string tenantId, CancellationToken cancellationToken);
    Task<AiToolPackageRecord> SetApprovalStateAsync(Guid id, AiToolPackageApprovalStatus approvalStatus, string? approvalComment, string? approvedBy, DateTime? approvedAtUtc, int expectedVersion, string correlationId, string tenantId, CancellationToken cancellationToken);
}
