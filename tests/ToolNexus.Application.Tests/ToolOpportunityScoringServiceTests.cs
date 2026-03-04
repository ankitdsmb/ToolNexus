using ToolNexus.Application.Services.Discovery;
using Xunit;

namespace ToolNexus.Application.Tests;

public sealed class ToolOpportunityScoringServiceTests
{
    [Fact]
    public void Score_ReturnsCandidate_WhenScoreExceedsThreshold()
    {
        var service = new ToolOpportunityScoringService();

        var result = service.Score(new ToolOpportunitySignals(
            SearchVolume: 95,
            Competition: 20,
            DeveloperDemand: 92,
            ExistingTools: 2,
            StackOverflowQuestions: 90,
            GithubIssues: 88));

        Assert.True(result.IsToolCandidate);
        Assert.True(result.Score > 70m);
    }

    [Fact]
    public void Score_ReturnsNonCandidate_WhenScoreDoesNotExceedThreshold()
    {
        var service = new ToolOpportunityScoringService();

        var result = service.Score(new ToolOpportunitySignals(
            SearchVolume: 40,
            Competition: 80,
            DeveloperDemand: 35,
            ExistingTools: 8,
            StackOverflowQuestions: 30,
            GithubIssues: 28));

        Assert.False(result.IsToolCandidate);
        Assert.True(result.Score <= 70m);
    }

    [Fact]
    public void GenerateCandidates_ReturnsOnlyHighScoringProblems()
    {
        var service = new ToolOpportunityScoringService();
        var discoveredProblems = new[]
        {
            new DiscoveredProblem("High-value API debugging workflow", new ToolOpportunitySignals(95, 10, 90, 1, 94, 92)),
            new DiscoveredProblem("Low-value niche formatter", new ToolOpportunitySignals(20, 85, 25, 12, 22, 18))
        };

        var candidates = service.GenerateCandidates(discoveredProblems);

        var candidate = Assert.Single(candidates);
        Assert.Equal("High-value API debugging workflow", candidate.ProblemStatement);
        Assert.True(candidate.Score > 70m);
    }
}
