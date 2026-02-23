using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public interface IAdminAuditLogService
{
    Task<ChangeHistoryPage> QueryAsync(ChangeHistoryQuery query, CancellationToken cancellationToken = default);
    Task<ChangeHistoryPayloadDetail?> GetPayloadDetailAsync(Guid id, CancellationToken cancellationToken = default);
}
