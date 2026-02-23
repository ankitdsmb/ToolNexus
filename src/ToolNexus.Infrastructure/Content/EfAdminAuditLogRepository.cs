using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Npgsql;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Infrastructure.Data;

namespace ToolNexus.Infrastructure.Content;

public sealed class EfAdminAuditLogRepository(
    ToolNexusContentDbContext dbContext,
    ILogger<EfAdminAuditLogRepository> logger) : IAdminAuditLogRepository
{
    public async Task<IReadOnlyList<AdminAuditLogEntry>> GetRecentAsync(int take, CancellationToken cancellationToken = default)
    {
        try
        {
            return await dbContext.AdminAuditLogs
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
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.UndefinedTable)
        {
            logger.LogWarning(ex, "Admin audit log table is missing. Returning no change-history records.");
            return [];
        }
    }
}
