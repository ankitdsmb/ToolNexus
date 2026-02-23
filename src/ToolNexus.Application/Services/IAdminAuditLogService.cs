using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public interface IAdminAuditLogService
{
    Task<IReadOnlyList<AdminAuditLogEntry>> GetRecentAsync(int take, CancellationToken cancellationToken = default);
}

