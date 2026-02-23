using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using ToolNexus.Infrastructure.Content.Entities;
using ToolNexus.Infrastructure.Data;

namespace ToolNexus.Infrastructure.Content;

public interface IAdminAuditLogger
{
    Task TryLogAsync(string actionType, string entityType, string entityId, object? before, object? after, CancellationToken cancellationToken);
}

public sealed class AdminAuditLogger(
    ToolNexusContentDbContext dbContext,
    IHttpContextAccessor httpContextAccessor,
    ILogger<AdminAuditLogger> logger) : IAdminAuditLogger
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public async Task TryLogAsync(string actionType, string entityType, string entityId, object? before, object? after, CancellationToken cancellationToken)
    {
        try
        {
            var entity = new AdminAuditLogEntity
            {
                UserId = ResolveUserId(),
                ActionType = actionType,
                EntityType = entityType,
                EntityId = entityId,
                BeforeJson = before is null ? null : JsonSerializer.Serialize(before, JsonOptions),
                AfterJson = after is null ? null : JsonSerializer.Serialize(after, JsonOptions),
                TimestampUtc = DateTime.UtcNow
            };

            dbContext.AdminAuditLogs.Add(entity);
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Admin audit log write failed for {ActionType} {EntityType} {EntityId}.", actionType, entityType, entityId);
        }
    }

    private string ResolveUserId()
    {
        var user = httpContextAccessor.HttpContext?.User;
        if (user is null)
        {
            return "system";
        }

        return user.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? user.FindFirstValue("sub")
            ?? user.Identity?.Name
            ?? "system";
    }
}

