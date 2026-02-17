using Microsoft.Extensions.Logging;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;

namespace ToolNexus.Application.Services.Pipeline.Steps;

public sealed class CacheWriteStep(IToolResultCache cache, ILogger<CacheWriteStep> logger) : IToolExecutionStep
{
    public int Order => 600;

    public async Task<ToolExecutionResponse> InvokeAsync(ToolExecutionContext context, ToolExecutionDelegate next, CancellationToken cancellationToken)
    {
        var response = await next(context, cancellationToken);
        if (context.CacheHit || context.Manifest?.IsCacheable != true || !response.Success)
        {
            return response;
        }

        if (!context.Items.TryGetValue("cache-key", out var value) || value is not string key)
        {
            return response;
        }

        try
        {
            await cache.SetAsync(key, new ToolResultCacheItem(response.Success, response.Output, response.Error), TimeSpan.FromSeconds(context.Policy?.CacheTtlSeconds ?? 300), cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Cache write failed for {Tool}/{Action}", context.ToolId, context.Action);
        }

        return response;
    }
}
