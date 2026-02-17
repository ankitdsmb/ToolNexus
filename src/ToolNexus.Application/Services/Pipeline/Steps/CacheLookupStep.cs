using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Logging;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;

namespace ToolNexus.Application.Services.Pipeline.Steps;

public sealed class CacheLookupStep(IToolResultCache cache, ILogger<CacheLookupStep> logger) : IToolExecutionStep
{
    public int Order => 400;

    public async Task<ToolExecutionResponse> InvokeAsync(ToolExecutionContext context, ToolExecutionDelegate next, CancellationToken cancellationToken)
    {
        if (context.Manifest?.IsCacheable != true)
        {
            return await next(context, cancellationToken);
        }

        var key = BuildCacheKey(context);
        context.Items["cache-key"] = key;
        var cached = await cache.GetAsync(key, cancellationToken);
        if (cached is null)
        {
            return await next(context, cancellationToken);
        }

        logger.LogDebug("Cache hit for {Tool}/{Action}", context.ToolId, context.Action);
        context.CacheHit = true;
        context.Response = new ToolExecutionResponse(cached.Success, cached.Output, cached.Error);
        return context.Response;
    }

    private static string BuildCacheKey(ToolExecutionContext context)
    {
        var hashBytes = SHA256.HashData(Encoding.UTF8.GetBytes(context.Input));
        return $"{context.ToolId}:{context.Action}:{Convert.ToHexString(hashBytes)}";
    }
}
