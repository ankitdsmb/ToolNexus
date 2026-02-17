using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ToolNexus.Application.Models;
using ToolNexus.Application.Options;
using ToolNexus.Application.Services;

namespace ToolNexus.Application.Services.Pipeline;

public sealed class CachingExecutionStep(
    IToolResultCache toolResultCache,
    IOptions<ToolResultCacheOptions> cacheOptions,
    ILogger<CachingExecutionStep> logger) : IToolExecutionStep
{
    public const string CacheHitContextKey = "pipeline.cache-hit";

    private static readonly ConcurrentDictionary<string, SemaphoreSlim> KeyLocks = new(StringComparer.Ordinal);
    private readonly TimeSpan _cacheDuration = TimeSpan.FromSeconds(Math.Max(1, cacheOptions.Value.AbsoluteExpirationSeconds));

    public int Order => 200;

    public async Task<ToolExecutionResponse> InvokeAsync(ToolExecutionContext context, ToolExecutionDelegate next, CancellationToken cancellationToken)
    {
        var cacheKey = BuildCacheKey(context.ToolId, context.Action, context.Input, context.Options);

        var cached = await TryGetCachedAsync(cacheKey, context, cancellationToken);
        if (cached is not null)
        {
            return cached;
        }

        var keyLock = KeyLocks.GetOrAdd(cacheKey, _ => new SemaphoreSlim(1, 1));
        await keyLock.WaitAsync(cancellationToken);
        try
        {
            cached = await TryGetCachedAsync(cacheKey, context, cancellationToken);
            if (cached is not null)
            {
                return cached;
            }

            var response = await next(context, cancellationToken);

            if (response.Success)
            {
                try
                {
                    await toolResultCache.SetAsync(
                        cacheKey,
                        new ToolResultCacheItem(response.Success, response.Output, response.Error),
                        _cacheDuration,
                        cancellationToken);
                }
                catch (Exception ex)
                {
                    logger.LogWarning(ex, "Cache write failed for tool {ToolId} action {Action}.", context.ToolId, context.Action);
                }
            }

            return response;
        }
        finally
        {
            keyLock.Release();
        }
    }

    private async Task<ToolExecutionResponse?> TryGetCachedAsync(string cacheKey, ToolExecutionContext context, CancellationToken cancellationToken)
    {
        try
        {
            var cached = await toolResultCache.GetAsync(cacheKey, cancellationToken);
            if (cached is null)
            {
                return null;
            }

            context.Items[CacheHitContextKey] = true;
            return new ToolExecutionResponse(cached.Success, cached.Output, cached.Error);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Cache read failed for tool {ToolId} action {Action}.", context.ToolId, context.Action);
            return null;
        }
    }

    private static string BuildCacheKey(string toolId, string action, string input, IDictionary<string, string> options)
    {
        var normalizedToolId = toolId.Trim().ToLowerInvariant();
        var normalizedAction = action.Trim().ToLowerInvariant();
        var inputHashBytes = SHA256.HashData(Encoding.UTF8.GetBytes(input));

        var optionPayload = options.OrderBy(x => x.Key, StringComparer.Ordinal)
            .Select(x => $"{x.Key}={x.Value}");
        var optionHashBytes = SHA256.HashData(Encoding.UTF8.GetBytes(string.Join("&", optionPayload)));

        return $"{normalizedToolId}:{normalizedAction}:{Convert.ToHexString(inputHashBytes).ToLowerInvariant()}:{Convert.ToHexString(optionHashBytes).ToLowerInvariant()}";
    }
}
