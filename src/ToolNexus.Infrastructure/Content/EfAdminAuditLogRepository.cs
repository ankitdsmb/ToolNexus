using Microsoft.EntityFrameworkCore;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Infrastructure.Data;

namespace ToolNexus.Infrastructure.Content;

public sealed class EfAdminAuditLogRepository(ToolNexusContentDbContext dbContext) : IAdminAuditLogRepository
{
    public async Task<IReadOnlyList<AdminAuditLogEntry>> GetRecentAsync(int take, CancellationToken cancellationToken = default)
        => await dbContext.AdminAuditLogs
            .AsNoTracking()
            .OrderByDescending(x => x.TimestampUtc)
            .Take(take)
            .Select(x => new AdminAuditLogEntry(
                x.Id,
                x.UserId,
                x.ActionType,
                x.EntityType,
                x.EntityId,
                x.BeforeJson,
                x.AfterJson,
                x.TimestampUtc))
            .ToListAsync(cancellationToken);
}

