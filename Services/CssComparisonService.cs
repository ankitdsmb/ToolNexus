using System.Reflection;

namespace ToolNexus.Services;

public sealed class CssComparisonService
{
    private readonly object _cssAnalysisService;

    public CssComparisonService(object cssAnalysisService)
    {
        _cssAnalysisService = cssAnalysisService ?? throw new ArgumentNullException(nameof(cssAnalysisService));
    }

    public async Task<ComparisonResult> CompareAsync(string urlA, string urlB, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(urlA))
        {
            throw new ArgumentException("Value cannot be null or whitespace.", nameof(urlA));
        }

        if (string.IsNullOrWhiteSpace(urlB))
        {
            throw new ArgumentException("Value cannot be null or whitespace.", nameof(urlB));
        }

        var analyzeMethod = ResolveAnalyzeMethod();

        var analysisTaskA = InvokeAnalyzeAsync(analyzeMethod, urlA, cancellationToken);
        var analysisTaskB = InvokeAnalyzeAsync(analyzeMethod, urlB, cancellationToken);

        await Task.WhenAll(analysisTaskA, analysisTaskB).ConfigureAwait(false);

        var scoreA = CalculateScore(analysisTaskA.Result);
        var scoreB = CalculateScore(analysisTaskB.Result);

        return new ComparisonResult
        {
            SiteA = urlA,
            SiteB = urlB,
            BetterSite = DetermineBetterSite(urlA, urlB, scoreA, scoreB),
            DifferenceScore = Math.Round(Math.Abs(scoreA - scoreB), 4, MidpointRounding.AwayFromZero)
        };
    }

    private MethodInfo ResolveAnalyzeMethod()
    {
        var serviceType = _cssAnalysisService.GetType();
        var methods = serviceType.GetMethods(BindingFlags.Public | BindingFlags.Instance)
            .Where(static m => string.Equals(m.Name, "AnalyzeAsync", StringComparison.Ordinal))
            .ToArray();

        var method = methods.FirstOrDefault(static m =>
        {
            var parameters = m.GetParameters();
            return parameters.Length == 2
                && parameters[0].ParameterType == typeof(string)
                && parameters[1].ParameterType == typeof(CancellationToken);
        }) ?? methods.FirstOrDefault(static m =>
        {
            var parameters = m.GetParameters();
            return parameters.Length == 1 && parameters[0].ParameterType == typeof(string);
        });

        return method ?? throw new InvalidOperationException("CssAnalysisService must expose AnalyzeAsync(string[, CancellationToken]).");
    }

    private async Task<object?> InvokeAnalyzeAsync(MethodInfo analyzeMethod, string url, CancellationToken cancellationToken)
    {
        var parameters = analyzeMethod.GetParameters().Length == 2
            ? new object?[] { url, cancellationToken }
            : new object?[] { url };

        var invocationResult = analyzeMethod.Invoke(_cssAnalysisService, parameters)
            ?? throw new InvalidOperationException("AnalyzeAsync returned null.");

        if (invocationResult is Task task)
        {
            await task.ConfigureAwait(false);
            return ReadTaskResult(task);
        }

        if (invocationResult is ValueTask valueTask)
        {
            await valueTask.ConfigureAwait(false);
            return null;
        }

        var resultType = invocationResult.GetType();
        if (resultType.IsGenericType && resultType.GetGenericTypeDefinition() == typeof(ValueTask<>))
        {
            var asTask = (Task)resultType.GetMethod("AsTask")!.Invoke(invocationResult, null)!;
            await asTask.ConfigureAwait(false);
            return ReadTaskResult(asTask);
        }

        return invocationResult;
    }

    private static object? ReadTaskResult(Task task)
    {
        var taskType = task.GetType();
        if (!taskType.IsGenericType)
        {
            return null;
        }

        return taskType.GetProperty("Result", BindingFlags.Public | BindingFlags.Instance)?.GetValue(task);
    }

    private static double CalculateScore(object? analysisResult)
    {
        if (analysisResult is null)
        {
            return 0;
        }

        var type = analysisResult.GetType();

        var directScore = TryGetDouble(type, analysisResult, "Score")
            ?? TryGetDouble(type, analysisResult, "QualityScore")
            ?? TryGetDouble(type, analysisResult, "ConfidenceScore");
        if (directScore.HasValue)
        {
            return directScore.Value;
        }

        var used = TryGetCount(type, analysisResult, "UsedSelectors", "Used");
        var unused = TryGetCount(type, analysisResult, "UnusedSelectors", "Unused");
        var duplicates = TryGetCount(type, analysisResult, "DuplicateSelectors", "Duplicates");

        if (used.HasValue || unused.HasValue || duplicates.HasValue)
        {
            var usedCount = used.GetValueOrDefault();
            var unusedCount = Math.Max(1, unused.GetValueOrDefault());
            var duplicateCount = duplicates.GetValueOrDefault();

            var usageRatio = (double)usedCount / (usedCount + unusedCount);
            var duplicatePenalty = Math.Min(0.2, duplicateCount * 0.05);
            return Math.Clamp(usageRatio - duplicatePenalty, 0d, 1d);
        }

        return 0;
    }

    private static int? TryGetCount(Type type, object instance, params string[] propertyNames)
    {
        foreach (var propertyName in propertyNames)
        {
            var property = type.GetProperty(propertyName, BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);
            if (property is null)
            {
                continue;
            }

            var value = property.GetValue(instance);
            if (value is null)
            {
                continue;
            }

            if (value is int number)
            {
                return number;
            }

            if (value is System.Collections.ICollection collection)
            {
                return collection.Count;
            }

            if (value is Array array)
            {
                return array.Length;
            }

            if (value is IEnumerable<object> enumerable)
            {
                return enumerable.Count();
            }
        }

        return null;
    }

    private static double? TryGetDouble(Type type, object instance, string propertyName)
    {
        var property = type.GetProperty(propertyName, BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);
        if (property is null)
        {
            return null;
        }

        var value = property.GetValue(instance);
        return value switch
        {
            null => null,
            double d => d,
            float f => f,
            decimal m => (double)m,
            int i => i,
            long l => l,
            _ => null
        };
    }

    private static string DetermineBetterSite(string siteA, string siteB, double scoreA, double scoreB)
    {
        if (Math.Abs(scoreA - scoreB) < 0.0001)
        {
            return "tie";
        }

        return scoreA > scoreB ? siteA : siteB;
    }
}

public sealed class ComparisonResult
{
    public string SiteA { get; init; } = string.Empty;
    public string SiteB { get; init; } = string.Empty;
    public string BetterSite { get; init; } = string.Empty;
    public double DifferenceScore { get; init; }
}
