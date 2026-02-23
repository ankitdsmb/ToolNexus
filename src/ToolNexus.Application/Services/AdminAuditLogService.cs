using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public sealed class AdminAuditLogService(IAdminAuditLogRepository repository) : IAdminAuditLogService
{
    public Task<ChangeHistoryPage> QueryAsync(ChangeHistoryQuery query, CancellationToken cancellationToken = default)
    {
        var safePage = query.Page <= 0 ? 1 : query.Page;
        var safePageSize = Math.Clamp(query.PageSize, 10, 100);
        return repository.QueryAsync(query with { Page = safePage, PageSize = safePageSize }, cancellationToken);
    }

    public Task<ChangeHistoryPayloadDetail?> GetPayloadDetailAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.GetPayloadDetailAsync(id, cancellationToken);
}
