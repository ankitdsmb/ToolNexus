using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public sealed class AdminAuditLogService(IAdminAuditLogRepository repository) : IAdminAuditLogService
{
    public Task<IReadOnlyList<AdminAuditLogEntry>> GetRecentAsync(int take, CancellationToken cancellationToken = default)
    {
        var clamped = Math.Clamp(take, 1, 500);
        return repository.GetRecentAsync(clamped, cancellationToken);
    }
}

