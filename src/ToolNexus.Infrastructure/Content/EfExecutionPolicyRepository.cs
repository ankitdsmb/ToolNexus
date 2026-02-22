using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Infrastructure.Content.Entities;
using ToolNexus.Infrastructure.Data;

namespace ToolNexus.Infrastructure.Content;

public sealed class EfExecutionPolicyRepository(ToolNexusContentDbContext db, IMemoryCache cache) : IExecutionPolicyRepository
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
            ? new ToolExecutionPolicyModel(tool.Id, tool.Slug, "Local", 30, 120, 1_000_000, true)
            : Map(policy);

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
                UpdatedAt = DateTimeOffset.UtcNow
            };
            db.ToolExecutionPolicies.Add(policy);
        }
        else
        {
            policy.ExecutionMode = request.ExecutionMode;
            policy.TimeoutSeconds = request.TimeoutSeconds;
            policy.MaxRequestsPerMinute = request.MaxRequestsPerMinute;
            policy.MaxInputSize = request.MaxInputSize;
            policy.IsExecutionEnabled = request.IsExecutionEnabled;
            policy.UpdatedAt = DateTimeOffset.UtcNow;
        }

        await db.SaveChangesAsync(cancellationToken);
        var model = Map(policy);
        cache.Set(Key(slug), model, TimeSpan.FromMinutes(10));
        return model;
    }

    private static ToolExecutionPolicyModel Map(ToolExecutionPolicyEntity entity)
        => new(entity.ToolDefinitionId, entity.ToolSlug, entity.ExecutionMode, entity.TimeoutSeconds, entity.MaxRequestsPerMinute, entity.MaxInputSize, entity.IsExecutionEnabled);
}
