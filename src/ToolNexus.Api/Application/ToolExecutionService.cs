using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Caching.Memory;
using ToolNexus.Api.Infrastructure;
using ToolNexus.Tools.Common;

namespace ToolNexus.Api.Application;

public sealed class ToolExecutionService(IToolExecutorFactory factory, IMemoryCache memoryCache) : IToolExecutionService
{
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(5);

    public async Task<ToolExecutionOutcome> ExecuteAsync(string slug, string action, ToolRequest request, CancellationToken cancellationToken)
    {
        var executor = factory.Resolve(slug);
        if (executor is null)
        {
            return new ToolExecutionOutcome(false, ToolResult.Fail($"Tool '{slug}' not found."));
        }

        var cacheKey = BuildCacheKey(slug, action, request.Input);
        if (memoryCache.TryGetValue<ToolResult>(cacheKey, out var cachedResult))
        {
            return new ToolExecutionOutcome(true, cachedResult!);
        }

        var options = request.Options is null
            ? new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            : new Dictionary<string, string>(request.Options, StringComparer.OrdinalIgnoreCase);

        options["action"] = action;
        var enrichedRequest = request with { Options = options };

        var result = await executor.ExecuteAsync(enrichedRequest, cancellationToken);

        if (result.Success)
        {
            memoryCache.Set(
                cacheKey,
                result,
                new MemoryCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = CacheDuration,
                    Size = 1
                });
        }

        return new ToolExecutionOutcome(true, result);
    }

    private static string BuildCacheKey(string slug, string action, string input)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(input));
        var inputHash = Convert.ToHexString(hash).ToLowerInvariant();
        return $"{slug}:{action}:{inputHash}";
    }
}
