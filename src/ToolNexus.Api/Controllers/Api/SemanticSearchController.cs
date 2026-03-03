using System.Collections;
using System.Reflection;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;

namespace ToolNexus.Api.Controllers.Api;

[ApiController]
[Route("api/semantic-search")]
public sealed class SemanticSearchController(
    IServiceProvider serviceProvider,
    IMemoryCache memoryCache,
    ILogger<SemanticSearchController> logger) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] string? q, CancellationToken cancellationToken)
    {
        var query = q?.Trim();
        if (string.IsNullOrWhiteSpace(query) || query.Length < 3)
        {
            return BadRequest(new { error = "Query must be at least 3 characters." });
        }

        var cacheKey = $"semantic-search:{query.ToLowerInvariant()}";
        var results = await memoryCache.GetOrCreateAsync(cacheKey, async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5);
            return await ExecuteSemanticSearchAsync(query, cancellationToken);
        }) ?? Array.Empty<SemanticSearchResult>();

        return Ok(new { results });
    }

    private async Task<IReadOnlyList<SemanticSearchResult>> ExecuteSemanticSearchAsync(string query, CancellationToken cancellationToken)
    {
        var inferenceEngine = ResolveRequiredService("MiniLmInferenceEngine");
        var embeddingStore = ResolveRequiredService("ToolEmbeddingStore");

        var embedding = await InvokeAsync(inferenceEngine, "Embed", query, cancellationToken);
        var ranked = await RankAsync(embeddingStore, embedding, cancellationToken);

        return ranked
            .Take(10)
            .Select(item => new SemanticSearchResult(item.Slug, item.Score))
            .ToArray();
    }

    private object ResolveRequiredService(string typeName)
    {
        var serviceType = AppDomain.CurrentDomain.GetAssemblies()
            .SelectMany(a => a.GetTypes())
            .FirstOrDefault(t => string.Equals(t.Name, typeName, StringComparison.Ordinal));

        if (serviceType is null)
        {
            throw new InvalidOperationException($"Required type '{typeName}' could not be found.");
        }

        return serviceProvider.GetRequiredService(serviceType);
    }

    private static async Task<object?> InvokeAsync(object target, string methodName, params object?[] args)
    {
        var method = target.GetType().GetMethods(BindingFlags.Public | BindingFlags.Instance)
            .FirstOrDefault(m => m.Name == methodName && m.GetParameters().Length == args.Length)
            ?? throw new InvalidOperationException($"Method '{methodName}' was not found on '{target.GetType().Name}'.");

        var invocationResult = method.Invoke(target, args);
        if (invocationResult is Task task)
        {
            await task.ConfigureAwait(false);
            return GetTaskResult(task);
        }

        return invocationResult;
    }

    private static object? GetTaskResult(Task task)
    {
        var resultProperty = task.GetType().GetProperty("Result", BindingFlags.Public | BindingFlags.Instance);
        return resultProperty?.GetValue(task);
    }

    private async Task<IReadOnlyList<SemanticSearchResult>> RankAsync(object store, object? embedding, CancellationToken cancellationToken)
    {
        foreach (var methodName in new[] { "RankEmbeddings", "Rank", "Search" })
        {
            var methods = store.GetType().GetMethods(BindingFlags.Public | BindingFlags.Instance)
                .Where(m => m.Name == methodName)
                .OrderBy(m => m.GetParameters().Length)
                .ToArray();

            foreach (var method in methods)
            {
                var args = BuildArgs(method, embedding, cancellationToken);
                if (args is null)
                {
                    continue;
                }

                var result = await InvokeAsync(store, method.Name, args);
                var parsed = ParseResults(result);
                if (parsed.Count > 0)
                {
                    return parsed;
                }
            }
        }

        logger.LogWarning("Semantic search ranking returned no results. StoreType={StoreType}", store.GetType().FullName);
        return Array.Empty<SemanticSearchResult>();
    }

    private static object?[]? BuildArgs(MethodInfo method, object? embedding, CancellationToken cancellationToken)
    {
        var parameters = method.GetParameters();
        var args = new object?[parameters.Length];

        for (var i = 0; i < parameters.Length; i++)
        {
            var parameterType = parameters[i].ParameterType;

            if (embedding is not null && parameterType.IsInstanceOfType(embedding))
            {
                args[i] = embedding;
            }
            else if (parameterType == typeof(string))
            {
                return null;
            }
            else if (parameterType == typeof(int))
            {
                args[i] = 10;
            }
            else if (parameterType == typeof(CancellationToken))
            {
                args[i] = cancellationToken;
            }
            else if (parameterType.IsClass || Nullable.GetUnderlyingType(parameterType) is not null)
            {
                args[i] = null;
            }
            else
            {
                return null;
            }
        }

        return args;
    }

    private static IReadOnlyList<SemanticSearchResult> ParseResults(object? result)
    {
        if (result is not IEnumerable enumerable)
        {
            return Array.Empty<SemanticSearchResult>();
        }

        var parsed = new List<SemanticSearchResult>();
        foreach (var item in enumerable)
        {
            if (item is null)
            {
                continue;
            }

            var itemType = item.GetType();
            var slugProperty = itemType.GetProperty("Slug") ?? itemType.GetProperty("slug");
            var scoreProperty = itemType.GetProperty("Score") ?? itemType.GetProperty("score");
            if (slugProperty?.GetValue(item) is not string slug || string.IsNullOrWhiteSpace(slug))
            {
                continue;
            }

            var scoreValue = scoreProperty?.GetValue(item);
            var score = scoreValue switch
            {
                float f => f,
                double d => (float)d,
                decimal m => (float)m,
                _ => 0f
            };

            parsed.Add(new SemanticSearchResult(slug, score));
        }

        return parsed
            .OrderByDescending(x => x.Score)
            .Take(10)
            .ToArray();
    }

    public sealed record SemanticSearchResult(string Slug, float Score);
}
