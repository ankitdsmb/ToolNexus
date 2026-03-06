namespace ToolNexus.Infrastructure.Content.Entities;

public sealed class FeedbackEntity
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string ScreenshotUrl { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; }
    public string Status { get; set; } = FeedbackStatus.New;
}

public static class FeedbackStatus
{
    public const string New = "New";
    public const string UnderReview = "Under Review";
    public const string Planned = "Planned";
    public const string Completed = "Completed";
}
