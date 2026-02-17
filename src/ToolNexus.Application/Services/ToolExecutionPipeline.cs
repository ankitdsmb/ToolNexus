using System.Diagnostics;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ToolNexus.Application.Models;
using ToolNexus.Application.Options;
using ToolNexus.Domain;

namespace ToolNexus.Application.Services;

public sealed class ToolExecutionPipeline(
    IEnumerable<IToolExecutor> executors,
    IToolResultCache toolResultCache,
    IOptions<ToolResultCacheOptions> cacheOptions,
    IToolExecutionResponseFactory responseFactory,
    IToolAnalytics analytics,
    ILogger<ToolExecutionPipeline> logger) : IToolExecutionPipeline
{
    private readonly Dictionary<string, IToolExecutor> _executorsBySlug = executors
        .ToDictionary(x => x.Slug, StringComparer.OrdinalIgnoreCase);

    private readonly TimeSpan _cacheDuration = TimeSpan.FromSeconds(Math.Max(1, cacheOptions.Value.AbsoluteExpirationSeconds));

    public async Task<ToolExecutionResponse> ExecuteAsync(string slug, string action, string input, CancellationToken cancellationToken)
    {
        var stopwatch = Stopwatch.StartNew();
        var normalizedSlug = slug?.Trim().ToLowerInvariant() ?? string.Empty;
        var normalizedAction = action?.Trim().ToLowerInvariant() ?? string.Empty;
        var normalizedInput = input?.Replace("\u0000", string.Empty) ?? string.Empty;
        var inputBytes = Encoding.UTF8.GetByteCount(normalizedInput);

        if (string.IsNullOrWhiteSpace(normalizedSlug))
        {
            return responseFactory.Failure("invalid_slug", "Tool slug is required.", null, stopwatch.ElapsedMilliseconds, false);
        }

        if (string.IsNullOrWhiteSpace(normalizedAction))
        {
            return responseFactory.Failure("invalid_action", "Action is required.", null, stopwatch.ElapsedMilliseconds, false);
        }

        if (!_executorsBySlug.TryGetValue(normalizedSlug, out var executor))
        {
            return responseFactory.Failure("tool_not_found", $"Tool '{normalizedSlug}' was not found.", null, stopwatch.ElapsedMilliseconds, false);
        }

        if (!executor.SupportedActions.Contains(normalizedAction, StringComparer.OrdinalIgnoreCase))
        {
            return responseFactory.Failure("action_not_supported", $"Action '{normalizedAction}' is not supported.", null, stopwatch.ElapsedMilliseconds, false);
        }

        var cacheKey = BuildCacheKey(normalizedSlug, normalizedAction, normalizedInput);

        try
        {
            var cached = await toolResultCache.GetAsync(cacheKey, cancellationToken);
            if (cached is not null)
            {
                stopwatch.Stop();
                var cachedResponse = cached.Success
                    ? responseFactory.Success(cached.Output, stopwatch.ElapsedMilliseconds, true)
                    : responseFactory.Failure("tool_execution_failed", "Tool execution failed.", cached.Error, stopwatch.ElapsedMilliseconds, true);

                LogMetrics(normalizedSlug, normalizedAction, cachedResponse, inputBytes);
                analytics.TrackExecution(new ToolExecutionAnalytics(normalizedSlug, normalizedAction, cachedResponse.Success, cachedResponse.Metadata.ExecutionTimeMs, DateTimeOffset.UtcNow));
                return cachedResponse;
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Cache read failed for {Slug} {Action}", normalizedSlug, normalizedAction);
        }

        ToolResult executionResult;
        try
        {
            executionResult = await executor.ExecuteAsync(new ToolRequest(normalizedAction, normalizedInput), cancellationToken);
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            var errorResponse = responseFactory.Failure("unexpected_error", "Tool execution failed unexpectedly.", ex.Message, stopwatch.ElapsedMilliseconds, false);
            LogMetrics(normalizedSlug, normalizedAction, errorResponse, inputBytes);
            analytics.TrackExecution(new ToolExecutionAnalytics(normalizedSlug, normalizedAction, false, errorResponse.Metadata.ExecutionTimeMs, DateTimeOffset.UtcNow));
            return errorResponse;
        }

        ToolExecutionResponse response;
        if (executionResult.Success)
        {
            response = responseFactory.Success(executionResult.Output, stopwatch.ElapsedMilliseconds, false);
            try
            {
                await toolResultCache.SetAsync(cacheKey, new ToolResultCacheItem(true, executionResult.Output, null), _cacheDuration, cancellationToken);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Cache write failed for {Slug} {Action}", normalizedSlug, normalizedAction);
            }
        }
        else
        {
            response = responseFactory.Failure("tool_execution_failed", "Tool execution failed.", executionResult.Error, stopwatch.ElapsedMilliseconds, false);
        }

        stopwatch.Stop();
        response = response with { Metadata = response.Metadata with { ExecutionTimeMs = stopwatch.ElapsedMilliseconds } };
        LogMetrics(normalizedSlug, normalizedAction, response, inputBytes);
        analytics.TrackExecution(new ToolExecutionAnalytics(normalizedSlug, normalizedAction, response.Success, response.Metadata.ExecutionTimeMs, DateTimeOffset.UtcNow));
        return response;
    }

    private void LogMetrics(string slug, string action, ToolExecutionResponse response, int inputBytes)
    {
        var outputBytes = response.Output is null ? 0 : Encoding.UTF8.GetByteCount(response.Output);

        if (response.Success)
        {
            logger.LogInformation(
                "ToolExecution {Slug} {Action} {ExecutionMs} {Success} {FromCache} {InputBytes} {OutputBytes}",
                slug,
                action,
                response.Metadata.ExecutionTimeMs,
                true,
                response.Metadata.FromCache,
                inputBytes,
                outputBytes);
            return;
        }

        logger.LogWarning(
            "ToolExecution {Slug} {Action} {ExecutionMs} {Success} {FromCache} {InputBytes} {OutputBytes}",
            slug,
            action,
            response.Metadata.ExecutionTimeMs,
            false,
            response.Metadata.FromCache,
            inputBytes,
            outputBytes);
    }

    private static string BuildCacheKey(string slug, string action, string input)
    {
        var hashBytes = SHA256.HashData(Encoding.UTF8.GetBytes(input));
        var hash = Convert.ToHexString(hashBytes).ToLowerInvariant();
        return $"{slug}:{action}:{hash}";
    }
}
