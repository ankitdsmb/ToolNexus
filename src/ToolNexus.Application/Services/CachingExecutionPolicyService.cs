using Microsoft.Extensions.Options;
using ToolNexus.Application.Models;
using ToolNexus.Application.Options;

namespace ToolNexus.Application.Services;

public sealed class CachingExecutionPolicyService(
    ExecutionPolicyService inner,
    IDistributedPlatformCache cache,
    IOptions<PlatformCacheOptions> options) : IExecutionPolicyService
{
    private const string SlugPrefix = "platform:execution-policies:slug:";
    private const string ToolIdPrefix = "platform:execution-policies:tool-id:";

    private readonly TimeSpan _ttl = TimeSpan.FromSeconds(options.Value.ExecutionPoliciesTtlSeconds);

    public Task<ToolExecutionPolicyModel> GetBySlugAsync(string slug, CancellationToken cancellationToken = default)
        => cache.GetOrCreateAsync($"{SlugPrefix}{slug}", token => inner.GetBySlugAsync(slug, token), _ttl, cancellationToken);

    public Task<ToolExecutionPolicyModel?> GetByToolIdAsync(int toolId, CancellationToken cancellationToken = default)
        => cache.GetOrCreateAsync($"{ToolIdPrefix}{toolId}", token => inner.GetByToolIdAsync(toolId, token), _ttl, cancellationToken);

    public async Task<ToolExecutionPolicyModel> UpdateBySlugAsync(string slug, UpdateToolExecutionPolicyRequest request, CancellationToken cancellationToken = default)
    {
        var updated = await inner.UpdateBySlugAsync(slug, request, cancellationToken);
        Invalidate(slug);
        if (updated.ToolId > 0)
        {
            _ = cache.RemoveAsync($"{ToolIdPrefix}{updated.ToolId}", cancellationToken);
        }

        return updated;
    }

    public void Invalidate(string slug)
    {
        _ = cache.RemoveAsync($"{SlugPrefix}{slug}");
        inner.Invalidate(slug);
    }
}
