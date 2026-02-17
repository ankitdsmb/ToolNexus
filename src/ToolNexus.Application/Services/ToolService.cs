using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ToolNexus.Application.Models;
using ToolNexus.Application.Options;
using ToolNexus.Domain;

namespace ToolNexus.Application.Services;

public sealed class ToolService(
    IEnumerable<IToolExecutor> executors,
    IToolResultCache toolResultCache,
    IOptions<ToolResultCacheOptions> cacheOptions,
    ILogger<ToolService> logger) : IToolService
{
    private readonly Dictionary<string, IToolExecutor> _executorsBySlug = executors
        .ToDictionary(x => x.Slug, StringComparer.OrdinalIgnoreCase);

    private readonly TimeSpan _cacheDuration = TimeSpan.FromSeconds(Math.Max(1, cacheOptions.Value.AbsoluteExpirationSeconds));

    public async Task<ToolExecutionResponse> ExecuteAsync(ToolExecutionRequest request, CancellationToken cancellationToken = default)
    {
        if (request is null)
        {
            logger.LogWarning("Tool execution request was null.");
            return new ToolExecutionResponse(false, string.Empty, "Request is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Slug))
        {
            return new ToolExecutionResponse(false, string.Empty, "Tool slug is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Action))
        {
            return new ToolExecutionResponse(false, string.Empty, "Action is required.");
        }

        if (request.Input is null)
        {
            return new ToolExecutionResponse(false, string.Empty, "Input is required.");
        }

        if (!_executorsBySlug.TryGetValue(request.Slug, out var executor))
        {
            return new ToolExecutionResponse(false, string.Empty, $"Tool '{request.Slug}' not found.", true);
        }

        var normalizedSlug = request.Slug.Trim().ToLowerInvariant();
        var normalizedAction = request.Action.Trim().ToLowerInvariant();
        var cacheKey = BuildCacheKey(normalizedSlug, normalizedAction, request.Input);

        ToolResultCacheItem? cached = null;
        try
        {
            cached = await toolResultCache.GetAsync(cacheKey, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed reading cache for tool {Slug} action {Action}.", normalizedSlug, normalizedAction);
        }

        if (cached is not null)
        {
            return new ToolExecutionResponse(cached.Success, cached.Output, cached.Error);
        }

        var options = request.Options is null
            ? null
            : new Dictionary<string, string>(request.Options, StringComparer.OrdinalIgnoreCase);

        ToolResult result;
        try
        {
            result = await executor.ExecuteAsync(new ToolRequest(normalizedAction, request.Input, options), cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unhandled tool execution error for tool {Slug} action {Action}.", normalizedSlug, normalizedAction);
            return new ToolExecutionResponse(false, string.Empty, "Tool execution failed unexpectedly.");
        }

        var response = new ToolExecutionResponse(result.Success, result.Output, result.Error);

        if (!response.Success)
        {
            logger.LogWarning("Tool execution failed for tool {Slug} action {Action}. Error: {Error}", normalizedSlug, normalizedAction, response.Error);
        }

        if (result.Success)
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
                logger.LogWarning(ex, "Failed writing cache for tool {Slug} action {Action}.", normalizedSlug, normalizedAction);
            }
        }

        return response;
    }

    private static string BuildCacheKey(string slug, string action, string input)
    {
        var hashBytes = SHA256.HashData(Encoding.UTF8.GetBytes(input));
        var hash = Convert.ToHexString(hashBytes).ToLowerInvariant();
        return $"{slug}:{action}:{hash}";
    }
}
