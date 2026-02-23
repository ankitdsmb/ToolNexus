using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ToolNexus.Infrastructure.Content.Entities;
using ToolNexus.Infrastructure.Data;
using ToolNexus.Infrastructure.Options;

namespace ToolNexus.Infrastructure.Content;

public interface IAdminAuditLogger
{
    Task TryLogAsync(string actionType, string entityType, string entityId, object? before, object? after, CancellationToken cancellationToken);
}

public sealed class AdminAuditLogger(
    ToolNexusContentDbContext dbContext,
    IHttpContextAccessor httpContextAccessor,
    IAuditPayloadProcessor payloadProcessor,
    IOptions<AuditGuardrailsOptions> options,
    AuditGuardrailsMetrics metrics,
    ILogger<AdminAuditLogger> logger) : IAdminAuditLogger
{
    public async Task TryLogAsync(string actionType, string entityType, string entityId, object? before, object? after, CancellationToken cancellationToken)
    {
        metrics.AuditWriteAttempts.Add(1);
        if (!options.Value.WriteEnabled)
        {
            return;
        }

        IDbContextTransaction? transaction = null;
        var ownsTransaction = false;
        var savepointName = $"audit_{Guid.NewGuid():N}";

        try
        {
            transaction = dbContext.Database.CurrentTransaction;
            if (transaction is null)
            {
                transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
                ownsTransaction = true;
            }

            await transaction.CreateSavepointAsync(savepointName, cancellationToken);

            var payload = payloadProcessor.Process(before, after);
            if (payload.RedactionApplied)
            {
                metrics.RedactionApplied.Add(1);
            }

            if (payload.TruncationApplied)
            {
                metrics.TruncationApplied.Add(1);
            }

            var now = DateTime.UtcNow;
            var auditEvent = new AuditEventEntity
            {
                Id = Guid.NewGuid(),
                OccurredAtUtc = now,
                ActorType = ResolveUserId() == "system" ? "system" : "admin_user",
                ActorId = ResolveUserId(),
                TenantId = httpContextAccessor.HttpContext?.Request.Headers["X-Tenant-Id"].ToString(),
                TraceId = httpContextAccessor.HttpContext?.TraceIdentifier,
                RequestId = httpContextAccessor.HttpContext?.Request.Headers["X-Request-Id"].ToString(),
                Action = NormalizeAction(actionType, entityType),
                TargetType = entityType,
                TargetId = entityId,
                ResultStatus = "success",
                HttpStatus = httpContextAccessor.HttpContext?.Response?.StatusCode,
                SourceIp = httpContextAccessor.HttpContext?.Connection?.RemoteIpAddress,
                UserAgent = Truncate(httpContextAccessor.HttpContext?.Request.Headers.UserAgent.ToString(), 512),
                PayloadRedacted = payload.PayloadJson,
                PayloadHashSha256 = payload.PayloadHashSha256,
                SchemaVersion = 1,
                CreatedAtUtc = now
            };

            dbContext.AuditEvents.Add(auditEvent);
            foreach (var destination in options.Value.Destinations)
            {
                dbContext.AuditOutbox.Add(new AuditOutboxEntity
                {
                    Id = Guid.NewGuid(),
                    AuditEventId = auditEvent.Id,
                    Destination = destination,
                    IdempotencyKey = $"{destination}:{auditEvent.Id}:v{auditEvent.SchemaVersion}",
                    DeliveryState = "pending",
                    AttemptCount = 0,
                    NextAttemptAtUtc = now,
                    CreatedAtUtc = now,
                    UpdatedAtUtc = now
                });
            }

            await dbContext.SaveChangesAsync(cancellationToken);
            await transaction.ReleaseSavepointAsync(savepointName, cancellationToken);
            if (ownsTransaction)
            {
                await transaction.CommitAsync(cancellationToken);
            }

            metrics.AuditWriteSuccess.Add(1);
        }
        catch (Exception ex)
        {
            if (transaction is not null)
            {
                await transaction.RollbackToSavepointAsync(savepointName, cancellationToken);
            }

            metrics.AuditWriteDegrade.Add(1);
            logger.LogWarning(ex, "Audit guardrail persistence failed; using platform fallback log. Fingerprint={Fingerprint}", $"{actionType}:{entityType}:{entityId}");
        }
        finally
        {
            if (ownsTransaction && transaction is not null)
            {
                await transaction.DisposeAsync();
            }
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

    private static string NormalizeAction(string actionType, string entityType)
        => $"admin.{entityType.ToLowerInvariant()}.{actionType.ToLowerInvariant()}";

    private static string? Truncate(string? value, int maxBytes)
    {
        if (string.IsNullOrEmpty(value)) return value;
        var bytes = System.Text.Encoding.UTF8.GetByteCount(value);
        if (bytes <= maxBytes) return value;
        var keep = value[..Math.Min(value.Length, maxBytes / 2)];
        return keep + $"<TRUNCATED bytes_original={bytes} bytes_kept={System.Text.Encoding.UTF8.GetByteCount(keep)}>";
    }
}
