using System.Collections.Concurrent;
using System.Collections.ObjectModel;
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

    // Single-flight dictionary to deduplicate backend calls per cache key.
    private static readonly ConcurrentDictionary<string, Task<ToolExecutionResponse>> Inflight = new(StringComparer.Ordinal);
    private readonly TimeSpan _cacheDuration = TimeSpan.FromSeconds(Math.Max(1, cacheOptions.Value.AbsoluteExpirationSeconds));

    public int Order => 200;

    public async Task<ToolExecutionResponse> InvokeAsync(ToolExecutionContext context, ToolExecutionDelegate next, CancellationToken cancellationToken)
    {
        if (context.Manifest?.IsCacheable != true)
        {
            return await next(context, cancellationToken);
        }

        var cacheOptions = context.Options as IReadOnlyDictionary<string, string>
            ?? new ReadOnlyDictionary<string, string>(context.Options);
        var cacheKey = CacheKeyBuilder.Build(context.ToolId, context.Action, context.Input, cacheOptions);

        var cached = await TryGetCachedAsync(cacheKey, context, cancellationToken);
        if (cached is not null)
        {
            return cached;
        }

        // Use CancellationToken.None for the shared population task so a single cancelled caller
        // does not cancel cache population for all other concurrent callers on the same key.
        var inflightTask = Inflight.GetOrAdd(cacheKey, _ => PopulateCacheAsync(cacheKey, context, next, CancellationToken.None));
        try
        {
            return await inflightTask.WaitAsync(cancellationToken);
        }
        finally
        {
            if (inflightTask.IsCompleted)
            {
                Inflight.TryRemove(new KeyValuePair<string, Task<ToolExecutionResponse>>(cacheKey, inflightTask));
            }
        }
    }

    private async Task<ToolExecutionResponse> PopulateCacheAsync(
        string cacheKey,
        ToolExecutionContext context,
        ToolExecutionDelegate next,
        CancellationToken cancellationToken)
    {
        var cached = await TryGetCachedAsync(cacheKey, context, cancellationToken);
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
}
