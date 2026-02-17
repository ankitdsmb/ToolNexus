using System.Buffers;
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

        var normalizedSlug = NormalizeToken(request.Slug);
        var normalizedAction = NormalizeToken(request.Action);
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

        var options = request.Options;
        if (options is not null && options.Count > 0 && !IsCaseInsensitiveDictionary(options))
        {
            options = new Dictionary<string, string>(options, StringComparer.OrdinalIgnoreCase);
        }

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

        if (!result.Success)
        {
            logger.LogWarning("Tool execution failed for tool {Slug} action {Action}. Error: {Error}", normalizedSlug, normalizedAction, result.Error);
            return new ToolExecutionResponse(false, result.Output, result.Error);
        }

        try
        {
            await toolResultCache.SetAsync(
                cacheKey,
                new ToolResultCacheItem(result.Success, result.Output, result.Error),
                _cacheDuration,
                cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed writing cache for tool {Slug} action {Action}.", normalizedSlug, normalizedAction);
        }

        return new ToolExecutionResponse(true, result.Output, result.Error);
    }

    private static bool IsCaseInsensitiveDictionary(IDictionary<string, string> options)
    {
        return options is Dictionary<string, string> dictionary &&
               dictionary.Comparer.Equals(StringComparer.OrdinalIgnoreCase);
    }

    private static string NormalizeToken(string value)
    {
        var trimmed = value.Trim();

        if (trimmed.Length == 0)
        {
            return string.Empty;
        }

        for (var i = 0; i < trimmed.Length; i++)
        {
            if (char.IsUpper(trimmed[i]))
            {
                return trimmed.ToLowerInvariant();
            }
        }

        return trimmed;
    }

    private static string BuildCacheKey(string slug, string action, string input)
    {
        var byteCount = Encoding.UTF8.GetByteCount(input);
        var rentedBytes = ArrayPool<byte>.Shared.Rent(byteCount);

        try
        {
            var written = Encoding.UTF8.GetBytes(input, rentedBytes);
            Span<byte> hashBuffer = stackalloc byte[32];
            SHA256.HashData(rentedBytes.AsSpan(0, written), hashBuffer);

            var hash = Convert.ToHexString(hashBuffer);
            var totalLength = slug.Length + action.Length + hash.Length + 2;

            return string.Create(totalLength, (slug, action, hash), static (span, state) =>
            {
                var index = 0;
                state.slug.AsSpan().CopyTo(span[index..]);
                index += state.slug.Length;
                span[index++] = ':';
                state.action.AsSpan().CopyTo(span[index..]);
                index += state.action.Length;
                span[index++] = ':';
                state.hash.AsSpan().CopyTo(span[index..]);
            });
        }
        finally
        {
            ArrayPool<byte>.Shared.Return(rentedBytes, clearArray: false);
        }
    }
}
