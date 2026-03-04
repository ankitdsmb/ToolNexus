using System.Text.RegularExpressions;

namespace ToolNexus.Workers.Workers.Discovery;

public sealed class TrendSourceAggregator(IEnumerable<ITrendSourceClient> sources)
{
    private static readonly Regex NonAlphaNumeric = new("[^a-z0-9]+", RegexOptions.Compiled | RegexOptions.CultureInvariant);

    public async Task<IReadOnlyList<DetectedProblem>> CollectMergedProblemsAsync(CancellationToken cancellationToken)
    {
        var rawCandidates = new List<ProblemSignal>();

        foreach (var source in sources)
        {
            var sourceSignals = await source.GetProblemSignalsAsync(cancellationToken);
            if (sourceSignals.Count == 0)
            {
                continue;
            }

            rawCandidates.AddRange(sourceSignals.Where(IsValid));
        }

        if (rawCandidates.Count == 0)
        {
            return [];
        }

        var merged = rawCandidates
            .GroupBy(x => BuildDuplicateMergeKey(x.Problem), StringComparer.Ordinal)
            .Select(MergeGroup)
            .OrderByDescending(x => x.SearchVolume)
            .ThenBy(x => x.Problem, StringComparer.Ordinal)
            .ToArray();

        return merged;
    }

    private static bool IsValid(ProblemSignal signal)
        => !string.IsNullOrWhiteSpace(signal.Problem)
           && !string.IsNullOrWhiteSpace(signal.Category)
           && signal.SearchVolume > 0;

    private static DetectedProblem MergeGroup(IGrouping<string, ProblemSignal> group)
    {
        var candidates = group.ToArray();

        var canonicalProblem = candidates
            .OrderByDescending(x => x.SearchVolume)
            .ThenByDescending(x => x.Problem.Length)
            .Select(x => x.Problem.Trim())
            .First();

        var canonicalCategory = candidates
            .GroupBy(x => x.Category.Trim(), StringComparer.OrdinalIgnoreCase)
            .OrderByDescending(x => x.Sum(y => y.SearchVolume))
            .ThenByDescending(x => x.Count())
            .Select(x => x.Key)
            .First();

        var totalVolume = candidates.Sum(x => x.SearchVolume);

        return new DetectedProblem(canonicalProblem, canonicalCategory, totalVolume);
    }

    private static string BuildDuplicateMergeKey(string text)
    {
        var normalized = NonAlphaNumeric.Replace(text.Trim().ToLowerInvariant(), " ");
        return Regex.Replace(normalized, "\\s+", " ").Trim();
    }
}

public interface ITrendSourceClient
{
    string SourceName { get; }

    Task<IReadOnlyCollection<ProblemSignal>> GetProblemSignalsAsync(CancellationToken cancellationToken);
}

public sealed record ProblemSignal(string Problem, string Category, int SearchVolume);

public sealed record DetectedProblem(string Problem, string Category, int SearchVolume);
