using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using ToolNexus.Application.Models;
using ToolNexus.Application.Options;
using ToolNexus.Domain;

namespace ToolNexus.Application.Services;

public sealed class ToolService(
    IEnumerable<IToolExecutor> executors,
    IToolResultCache toolResultCache,
    IOptions<ToolResultCacheOptions> cacheOptions) : IToolService
{
    private readonly Dictionary<string, IToolExecutor> _executorsBySlug = executors
        .ToDictionary(x => x.Slug, StringComparer.OrdinalIgnoreCase);

    private readonly TimeSpan _cacheDuration = TimeSpan.FromSeconds(Math.Max(1, cacheOptions.Value.AbsoluteExpirationSeconds));

    public async Task<ToolExecutionResponse> ExecuteAsync(ToolExecutionRequest request, CancellationToken cancellationToken = default)
    {
        if (!_executorsBySlug.TryGetValue(request.Slug, out var executor))
        {
            return new ToolExecutionResponse(false, string.Empty, $"Tool '{request.Slug}' not found.", true);
        }

        var normalizedSlug = request.Slug.Trim().ToLowerInvariant();
        var normalizedAction = request.Action.Trim().ToLowerInvariant();
        var cacheKey = BuildCacheKey(normalizedSlug, normalizedAction, request.Input);

        var cached = await toolResultCache.GetAsync(cacheKey, cancellationToken);
        if (cached is not null)
        {
            return new ToolExecutionResponse(cached.Success, cached.Output, cached.Error);
        }

        var options = request.Options is null
            ? null
            : new Dictionary<string, string>(request.Options, StringComparer.OrdinalIgnoreCase);

        var result = await executor.ExecuteAsync(new ToolRequest(normalizedAction, request.Input, options), cancellationToken);
        var response = new ToolExecutionResponse(result.Success, result.Output, result.Error);

        if (result.Success)
        {
            await toolResultCache.SetAsync(
                cacheKey,
                new ToolResultCacheItem(response.Success, response.Output, response.Error),
                _cacheDuration,
                cancellationToken);
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
