using Microsoft.EntityFrameworkCore;
using ToolNexus.Infrastructure.Data;

namespace ToolNexus.Api.Services.Reputation;

public sealed class ToolRatingService(
    ToolNexusContentDbContext dbContext,
    DeveloperReputationService developerReputationService)
{
    public async Task RecordRatingAsync(
        string toolSlug,
        string userId,
        string developerId,
        int rating,
        int publishedTools,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(toolSlug))
        {
            throw new ArgumentException("Tool slug is required.", nameof(toolSlug));
        }

        if (string.IsNullOrWhiteSpace(userId))
        {
            throw new ArgumentException("User id is required.", nameof(userId));
        }

        if (string.IsNullOrWhiteSpace(developerId))
        {
            throw new ArgumentException("Developer id is required.", nameof(developerId));
        }

        if (rating is < 1 or > 5)
        {
            throw new ArgumentOutOfRangeException(nameof(rating), "Rating must be between 1 and 5.");
        }

        var now = DateTime.UtcNow;
        var updatedRows = await dbContext.Database.ExecuteSqlAsync($"""
            UPDATE tool_ratings
            SET
                "rating" = {rating},
                "createdAt" = {now}
            WHERE "toolSlug" = {toolSlug}
              AND "userId" = {userId}
            """, cancellationToken);

        if (updatedRows == 0)
        {
            await dbContext.Database.ExecuteSqlAsync($"""
                INSERT INTO tool_ratings ("toolSlug", "userId", "rating", "createdAt")
                VALUES ({toolSlug}, {userId}, {rating}, {now})
                """, cancellationToken);
        }

        var averageRating = await dbContext.Database
            .SqlQuery<RatingSnapshot>($"""
                SELECT AVG("rating")::decimal AS "AverageRating"
                FROM tool_ratings
                WHERE "toolSlug" = {toolSlug}
                """)
            .SingleAsync(cancellationToken);

        await developerReputationService.RecalculateFromRatingsAsync(
            developerId,
            averageRating.AverageRating,
            publishedTools,
            cancellationToken);
    }

    private sealed class RatingSnapshot
    {
        public decimal AverageRating { get; init; }
    }
}
