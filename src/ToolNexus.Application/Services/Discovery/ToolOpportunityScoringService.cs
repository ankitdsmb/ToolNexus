namespace ToolNexus.Application.Services.Discovery;

public sealed class ToolOpportunityScoringService
{
    private const decimal SearchVolumeWeight = 0.4m;
    private const decimal StackOverflowWeight = 0.3m;
    private const decimal GitHubIssuesWeight = 0.3m;
    private const decimal CompetitionPenaltyWeight = 0.1m;
    private const decimal ExistingToolsPenaltyPerTool = 1.5m;
    private const decimal CandidateThreshold = 70m;

    public ToolOpportunityScoreResult Score(ToolOpportunitySignals signals)
    {
        var searchVolume = ClampToPercent(signals.SearchVolume);
        var stackOverflowQuestions = ClampToPercent(signals.StackOverflowQuestions);
        var githubIssues = ClampToPercent(signals.GithubIssues);
        var competition = ClampToPercent(signals.Competition);
        var existingTools = Math.Max(0, signals.ExistingTools);

        var baseScore =
            (searchVolume * SearchVolumeWeight)
            + (stackOverflowQuestions * StackOverflowWeight)
            + (githubIssues * GitHubIssuesWeight);

        var adjustedDemandScore = (baseScore + ClampToPercent(signals.DeveloperDemand)) / 2m;
        var competitionPenalty = competition * CompetitionPenaltyWeight;
        var existingToolsPenalty = existingTools * ExistingToolsPenaltyPerTool;

        var score = Math.Clamp(adjustedDemandScore - competitionPenalty - existingToolsPenalty, 0m, 100m);
        var isCandidate = score > CandidateThreshold;

        return new ToolOpportunityScoreResult(
            Score: decimal.Round(score, 2),
            IsToolCandidate: isCandidate,
            CandidateReason: isCandidate
                ? "Opportunity score exceeded threshold and qualifies as a tool candidate."
                : "Opportunity score did not exceed candidate threshold.");
    }

    public IReadOnlyCollection<ToolCandidate> GenerateCandidates(IEnumerable<DiscoveredProblem> discoveredProblems)
    {
        ArgumentNullException.ThrowIfNull(discoveredProblems);

        var candidates = new List<ToolCandidate>();
        foreach (var problem in discoveredProblems)
        {
            var result = Score(problem.Signals);
            if (!result.IsToolCandidate)
            {
                continue;
            }

            candidates.Add(new ToolCandidate(problem.ProblemStatement, result.Score));
        }

        return candidates;
    }

    private static decimal ClampToPercent(decimal value)
        => Math.Clamp(value, 0m, 100m);
}

public sealed record ToolOpportunitySignals(
    decimal SearchVolume,
    decimal Competition,
    decimal DeveloperDemand,
    int ExistingTools,
    decimal StackOverflowQuestions,
    decimal GithubIssues);

public sealed record DiscoveredProblem(string ProblemStatement, ToolOpportunitySignals Signals);

public sealed record ToolOpportunityScoreResult(decimal Score, bool IsToolCandidate, string CandidateReason);

public sealed record ToolCandidate(string ProblemStatement, decimal Score);
