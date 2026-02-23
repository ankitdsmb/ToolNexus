using Microsoft.Extensions.Options;
using ToolNexus.Application.Models;
using ToolNexus.Application.Options;

namespace ToolNexus.Application.Services;

public sealed class CachingToolDefinitionService(
    ToolDefinitionService inner,
    IDistributedPlatformCache cache,
    IOptions<PlatformCacheOptions> options) : IToolDefinitionService
{
    private const string ListKey = "platform:tool-definitions:list";
    private const string DetailPrefix = "platform:tool-definitions:detail:";

    private readonly TimeSpan _ttl = TimeSpan.FromSeconds(options.Value.ToolMetadataTtlSeconds);

    public Task<IReadOnlyCollection<ToolDefinitionListItem>> GetListAsync(CancellationToken cancellationToken = default)
        => cache.GetOrCreateAsync(ListKey, inner.GetListAsync, _ttl, cancellationToken);

    public Task<ToolDefinitionDetail?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
        => cache.GetOrCreateAsync($"{DetailPrefix}{id}", token => inner.GetByIdAsync(id, token), _ttl, cancellationToken);

    public async Task<ToolDefinitionDetail> CreateAsync(CreateToolDefinitionRequest request, CancellationToken cancellationToken = default)
    {
        var created = await inner.CreateAsync(request, cancellationToken);
        Invalidate();
        return created;
    }

    public async Task<ToolDefinitionDetail?> UpdateAsync(int id, UpdateToolDefinitionRequest request, CancellationToken cancellationToken = default)
    {
        var updated = await inner.UpdateAsync(id, request, cancellationToken);
        Invalidate();
        return updated;
    }

    public async Task<bool> SetEnabledAsync(int id, bool enabled, CancellationToken cancellationToken = default)
    {
        var result = await inner.SetEnabledAsync(id, enabled, cancellationToken);
        Invalidate();
        return result;
    }

    private void Invalidate()
    {
        _ = cache.RemoveAsync(ListKey);
        _ = cache.RemoveByPrefixAsync(DetailPrefix);
    }
}
