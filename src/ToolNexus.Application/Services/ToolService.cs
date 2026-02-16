using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using ToolNexus.Application.Models;
using ToolNexus.Application.Options;
using ToolNexus.Domain;

namespace ToolNexus.Application.Services;

public sealed class ToolService(
    IEnumerable<IToolExecutor> executors,
    IMemoryCache memoryCache,
    IOptions<ToolResultCacheOptions> cacheOptions) : IToolService
{
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(5);

    private readonly Dictionary<string, IToolExecutor> _executorsBySlug = executors
        .ToDictionary(x => x.Slug, StringComparer.OrdinalIgnoreCase);

    private readonly int _maxEntries = Math.Max(1, cacheOptions.Value.MaxEntries);

    public async Task<ToolExecutionResponse> ExecuteAsync(ToolExecutionRequest request, CancellationToken cancellationToken = default)
    {
        if (!_executorsBySlug.TryGetValue(request.Slug, out var executor))
        {
            return new ToolExecutionResponse(false, string.Empty, $"Tool '{request.Slug}' not found.", true);
        }

        var normalizedSlug = request.Slug.Trim().ToLowerInvariant();
        var normalizedAction = request.Action.Trim().ToLowerInvariant();
        var cacheKey = BuildCacheKey(normalizedSlug, normalizedAction, request.Input);
        if (memoryCache.TryGetValue<ToolExecutionResponse>(cacheKey, out var cachedResponse))
        {
            return cachedResponse!;
        }

        var options = request.Options is null
            ? null
            : new Dictionary<string, string>(request.Options, StringComparer.OrdinalIgnoreCase);

        var result = await executor.ExecuteAsync(new ToolRequest(normalizedAction, request.Input, options), cancellationToken);
        var response = new ToolExecutionResponse(result.Success, result.Output, result.Error);

        if (result.Success)
        {
            memoryCache.Set(cacheKey, response, new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = CacheDuration,
                Size = 1
            });

            TrimCacheIfNeeded(memoryCache);
        }

        return response;
    }

    private void TrimCacheIfNeeded(IMemoryCache memoryCache)
    {
        if (memoryCache is MemoryCache concreteCache && concreteCache.Count > _maxEntries)
        {
            concreteCache.Compact(0.10);
        }
    }

    private static string BuildCacheKey(string slug, string action, string input)
    {
        var hashBytes = SHA256.HashData(Encoding.UTF8.GetBytes(input));
        var hash = Convert.ToHexString(hashBytes).ToLowerInvariant();
        return $"{slug}:{action}:{hash}";
    }
}
