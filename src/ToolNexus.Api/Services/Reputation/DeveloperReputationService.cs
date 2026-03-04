using Microsoft.EntityFrameworkCore;
using ToolNexus.Infrastructure.Data;

namespace ToolNexus.Api.Services.Reputation;

public sealed class DeveloperReputationService(ToolNexusContentDbContext dbContext)
{
    private const decimal RatingWeight = 20m;
    private const decimal PublishedToolWeight = 2m;
    private const decimal DownloadReward = 0.25m;
    private const decimal CrashPenalty = 2.5m;
    private const decimal MinReputation = 0m;
    private const decimal MaxReputation = 100m;

    public async Task RecalculateFromRatingsAsync(
        string developerId,
        decimal averageRating,
        int publishedTools,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(developerId))
        {
            throw new ArgumentException("Developer id is required.", nameof(developerId));
        }

        if (publishedTools < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(publishedTools), "Published tools cannot be negative.");
        }

        var boundedAverageRating = Math.Clamp(averageRating, 1m, 5m);
        var score = ClampScore((boundedAverageRating * RatingWeight) + (publishedTools * PublishedToolWeight));

        await UpsertReputationAsync(developerId, score, publishedTools, boundedAverageRating, cancellationToken);
    }

    public async Task RecordDownloadAsync(string developerId, int downloadCount = 1, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(developerId))
        {
            throw new ArgumentException("Developer id is required.", nameof(developerId));
        }

        if (downloadCount <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(downloadCount), "Download count must be greater than zero.");
        }

        var snapshot = await GetOrCreateSnapshotAsync(developerId, cancellationToken);
        var nextScore = ClampScore(snapshot.ReputationScore + (downloadCount * DownloadReward));

        await UpsertReputationAsync(
            developerId,
            nextScore,
            snapshot.PublishedTools,
            snapshot.AverageRating,
            cancellationToken);
    }

    public async Task RecordCrashAsync(string developerId, int crashCount = 1, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(developerId))
        {
            throw new ArgumentException("Developer id is required.", nameof(developerId));
        }

        if (crashCount <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(crashCount), "Crash count must be greater than zero.");
        }

        var snapshot = await GetOrCreateSnapshotAsync(developerId, cancellationToken);
        var nextScore = ClampScore(snapshot.ReputationScore - (crashCount * CrashPenalty));

        await UpsertReputationAsync(
            developerId,
            nextScore,
            snapshot.PublishedTools,
            snapshot.AverageRating,
            cancellationToken);
    }

    public async Task<bool> RequiresStrictModerationAsync(
        string developerId,
        decimal minimumReputationScore = 40m,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(developerId))
        {
            throw new ArgumentException("Developer id is required.", nameof(developerId));
        }

        var snapshot = await dbContext.Database
            .SqlQuery<DeveloperReputationSnapshot>($"""
                SELECT
                    "developerId" AS "DeveloperId",
                    "reputationScore" AS "ReputationScore",
                    "publishedTools" AS "PublishedTools",
                    "averageRating" AS "AverageRating"
                FROM developer_reputation
                WHERE "developerId" = {developerId}
                """)
            .SingleOrDefaultAsync(cancellationToken);

        return snapshot is null || snapshot.ReputationScore < minimumReputationScore;
    }

    private async Task<DeveloperReputationSnapshot> GetOrCreateSnapshotAsync(string developerId, CancellationToken cancellationToken)
    {
        var existing = await dbContext.Database
            .SqlQuery<DeveloperReputationSnapshot>($"""
                SELECT
                    "developerId" AS "DeveloperId",
                    "reputationScore" AS "ReputationScore",
                    "publishedTools" AS "PublishedTools",
                    "averageRating" AS "AverageRating"
                FROM developer_reputation
                WHERE "developerId" = {developerId}
                """)
            .SingleOrDefaultAsync(cancellationToken);

        if (existing is not null)
        {
            return existing;
        }

        var seed = new DeveloperReputationSnapshot
        {
            DeveloperId = developerId,
            ReputationScore = 50m,
            PublishedTools = 0,
            AverageRating = 0m
        };

        await UpsertReputationAsync(
            seed.DeveloperId,
            seed.ReputationScore,
            seed.PublishedTools,
            seed.AverageRating,
            cancellationToken);

        return seed;
    }

    private async Task UpsertReputationAsync(
        string developerId,
        decimal reputationScore,
        int publishedTools,
        decimal averageRating,
        CancellationToken cancellationToken)
    {
        await dbContext.Database.ExecuteSqlAsync($"""
            INSERT INTO developer_reputation ("developerId", "reputationScore", "publishedTools", "averageRating")
            VALUES ({developerId}, {reputationScore}, {publishedTools}, {averageRating})
            ON CONFLICT ("developerId") DO UPDATE
            SET
                "reputationScore" = EXCLUDED."reputationScore",
                "publishedTools" = EXCLUDED."publishedTools",
                "averageRating" = EXCLUDED."averageRating"
            """, cancellationToken);
    }

    private static decimal ClampScore(decimal score) => Math.Clamp(score, MinReputation, MaxReputation);

    private sealed class DeveloperReputationSnapshot
    {
        public string DeveloperId { get; init; } = string.Empty;
        public decimal ReputationScore { get; init; }
        public int PublishedTools { get; init; }
        public decimal AverageRating { get; init; }
    }
}
