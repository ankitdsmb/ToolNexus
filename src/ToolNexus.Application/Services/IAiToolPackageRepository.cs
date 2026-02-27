using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public interface IAiToolPackageRepository
{
    Task<bool> ExistsBySlugAsync(string slug, CancellationToken cancellationToken);
    Task<AiToolPackageRecord> CreateAsync(AiToolPackageContract contract, string correlationId, string tenantId, CancellationToken cancellationToken);
    Task<AiToolPackageRecord?> GetBySlugAsync(string slug, CancellationToken cancellationToken);
}
