using Microsoft.Extensions.Caching.Memory;
using ToolNexus.Infrastructure.Content.Entities;
using ToolNexus.Infrastructure.Data;
using ToolNexus.Web.Models;

namespace ToolNexus.Web.Services;

public sealed class FeedbackService(ToolNexusContentDbContext dbContext, IMemoryCache memoryCache) : IFeedbackService
{
    private static readonly TimeSpan SubmissionWindow = TimeSpan.FromMinutes(1);

    public async Task<FeedbackSubmissionResult> SubmitAsync(FeedbackSubmissionViewModel model, string? remoteIpAddress, CancellationToken cancellationToken)
    {
        if (!FeedbackSubmissionViewModel.Categories.Contains(model.Category, StringComparer.Ordinal))
        {
            return FeedbackSubmissionResult.Failed("Pick a valid category.");
        }

        if (IsRateLimited(remoteIpAddress))
        {
            return FeedbackSubmissionResult.Failed("Please wait a minute before sending another message.");
        }

        var entity = new FeedbackEntity
        {
            Id = Guid.NewGuid(),
            Name = model.Name?.Trim() ?? string.Empty,
            Email = model.Email?.Trim() ?? string.Empty,
            Category = model.Category,
            Message = model.Message.Trim(),
            ScreenshotUrl = model.ScreenshotUrl?.Trim() ?? string.Empty,
            CreatedAt = DateTimeOffset.UtcNow,
            Status = FeedbackStatus.New
        };

        dbContext.Feedback.Add(entity);
        await dbContext.SaveChangesAsync(cancellationToken);

        MarkSubmitted(remoteIpAddress);
        return FeedbackSubmissionResult.Success();
    }

    private bool IsRateLimited(string? remoteIpAddress)
    {
        var key = BuildRateLimitKey(remoteIpAddress);
        return memoryCache.TryGetValue(key, out _);
    }

    private void MarkSubmitted(string? remoteIpAddress)
    {
        var key = BuildRateLimitKey(remoteIpAddress);
        memoryCache.Set(key, true, SubmissionWindow);
    }

    private static string BuildRateLimitKey(string? remoteIpAddress)
    {
        var normalizedIp = string.IsNullOrWhiteSpace(remoteIpAddress) ? "unknown" : remoteIpAddress;
        return $"feedback-submit:{normalizedIp}";
    }
}
