using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Infrastructure.Content.Entities;
using ToolNexus.Infrastructure.Data;

namespace ToolNexus.Infrastructure.Content;

public sealed class EfExecutionPolicyRepository(
    ToolNexusContentDbContext db,
    IMemoryCache cache,
    IAdminAuditLogger auditLogger,
    ILogger<EfExecutionPolicyRepository> logger) : IExecutionPolicyRepository
{
    private static string Key(string slug) => $"execution-policy::{slug.ToLowerInvariant()}";

    public async Task<ToolExecutionPolicyModel?> GetBySlugAsync(string slug, CancellationToken cancellationToken = default)
    {
        if (cache.TryGetValue<ToolExecutionPolicyModel>(Key(slug), out var model))
        {
            return model;
        }

        var tool = await db.ToolDefinitions.AsNoTracking().FirstOrDefaultAsync(x => x.Slug == slug, cancellationToken);
        if (tool is null)
        {
            return null;
        }

        var policy = await db.ToolExecutionPolicies.AsNoTracking().FirstOrDefaultAsync(x => x.ToolDefinitionId == tool.Id, cancellationToken);
        model = policy is null
            ? new ToolExecutionPolicyModel(tool.Id, tool.Slug, "Local", 30, 120, 1_000_000, true, null)
            : Map(policy, includeVersionToken: true);

        cache.Set(Key(slug), model, TimeSpan.FromMinutes(10));
        return model;
    }

    public async Task<ToolExecutionPolicyModel?> GetByToolIdAsync(int toolId, CancellationToken cancellationToken = default)
    {
        var tool = await db.ToolDefinitions.AsNoTracking().FirstOrDefaultAsync(x => x.Id == toolId, cancellationToken);
        return tool is null ? null : await GetBySlugAsync(tool.Slug, cancellationToken);
    }

    public async Task<ToolExecutionPolicyModel?> UpsertBySlugAsync(string slug, UpdateToolExecutionPolicyRequest request, CancellationToken cancellationToken = default)
    {
        var tool = await db.ToolDefinitions.FirstOrDefaultAsync(x => x.Slug == slug, cancellationToken);
        if (tool is null)
        {
            return null;
        }

        var policy = await db.ToolExecutionPolicies.FirstOrDefaultAsync(x => x.ToolDefinitionId == tool.Id, cancellationToken);
        bool? beforeEnabled = null;
        object? before = null;

        if (policy is null)
        {
            policy = new ToolExecutionPolicyEntity
            {
                ToolDefinitionId = tool.Id,
                ToolSlug = tool.Slug,
                ExecutionMode = request.ExecutionMode,
                TimeoutSeconds = request.TimeoutSeconds,
                MaxRequestsPerMinute = request.MaxRequestsPerMinute,
                MaxInputSize = request.MaxInputSize,
                IsExecutionEnabled = request.IsExecutionEnabled,
                UpdatedAt = DateTimeOffset.UtcNow,
                RowVersion = ConcurrencyTokenCodec.NewToken()
            };
            db.ToolExecutionPolicies.Add(policy);
        }
        else
        {
            beforeEnabled = policy.IsExecutionEnabled;
            before = new
            {
                policy.ExecutionMode,
                policy.TimeoutSeconds,
                policy.MaxRequestsPerMinute,
                policy.MaxInputSize,
                policy.IsExecutionEnabled
            };

            ApplyUpdates(policy, request);
        }

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);

        if (!await SaveWithConcurrencyRecoveryAsync(policy, request, cancellationToken))
        {
            return null;
        }

        await auditLogger.TryLogAsync(
            "PolicyChanged",
            "ToolExecutionPolicy",
            policy.Id.ToString(),
            before,
            new
            {
                policy.ExecutionMode,
                policy.TimeoutSeconds,
                policy.MaxRequestsPerMinute,
                policy.MaxInputSize,
                policy.IsExecutionEnabled
            },
            cancellationToken);

        if (beforeEnabled.HasValue && beforeEnabled.Value != policy.IsExecutionEnabled)
        {
            await auditLogger.TryLogAsync(
                "FeatureFlagChanged",
                "ToolExecutionPolicy",
                policy.Id.ToString(),
                new { IsExecutionEnabled = beforeEnabled.Value },
                new { policy.IsExecutionEnabled },
                cancellationToken);
        }

        await transaction.CommitAsync(cancellationToken);

        var model = Map(policy, includeVersionToken: false);
        cache.Set(Key(slug), model, TimeSpan.FromMinutes(10));
        return model;
    }

    private async Task<bool> SaveWithConcurrencyRecoveryAsync(ToolExecutionPolicyEntity policy, UpdateToolExecutionPolicyRequest request, CancellationToken cancellationToken)
    {
        var attemptedToken = ConcurrencyTokenCodec.Encode(db.Entry(policy).Property(x => x.RowVersion).OriginalValue);

        try
        {
            await db.SaveChangesAsync(cancellationToken);
            return true;
        }
        catch (DbUpdateConcurrencyException ex)
        {
            logger.LogWarning(ex, "Optimistic concurrency conflict for ToolExecutionPolicy {PolicyId}.", policy.Id);

            var currentToken = await db.ToolExecutionPolicies.AsNoTracking().Where(x => x.Id == policy.Id).Select(x => x.RowVersion).SingleOrDefaultAsync(cancellationToken);
            await auditLogger.TryLogAsync(
                "ConcurrencyConflictDetected",
                "ToolExecutionPolicy",
                policy.Id.ToString(),
                new { AttemptedToken = attemptedToken },
                new { CurrentToken = ConcurrencyTokenCodec.Encode(currentToken) },
                cancellationToken);

            db.Entry(policy).State = EntityState.Detached;
            var latest = await db.ToolExecutionPolicies.SingleOrDefaultAsync(x => x.Id == policy.Id, cancellationToken);
            if (latest is null)
            {
                return false;
            }

            ApplyUpdates(latest, request);
            policy.ToolDefinitionId = latest.ToolDefinitionId;
            policy.RowVersion = latest.RowVersion;

            await db.SaveChangesAsync(cancellationToken);
            return true;
        }
    }

    private static void ApplyUpdates(ToolExecutionPolicyEntity policy, UpdateToolExecutionPolicyRequest request)
    {
        policy.ExecutionMode = request.ExecutionMode;
        policy.TimeoutSeconds = request.TimeoutSeconds;
        policy.MaxRequestsPerMinute = request.MaxRequestsPerMinute;
        policy.MaxInputSize = request.MaxInputSize;
        policy.IsExecutionEnabled = request.IsExecutionEnabled;
        policy.UpdatedAt = DateTimeOffset.UtcNow;
        policy.RowVersion = ConcurrencyTokenCodec.NewToken();
    }

    private static ToolExecutionPolicyModel Map(ToolExecutionPolicyEntity entity, bool includeVersionToken)
        => new(entity.ToolDefinitionId, entity.ToolSlug, entity.ExecutionMode, entity.TimeoutSeconds, entity.MaxRequestsPerMinute, entity.MaxInputSize, entity.IsExecutionEnabled, includeVersionToken ? ConcurrencyTokenCodec.Encode(entity.RowVersion) : null);
}
