namespace ToolNexus.Web.Services;

public sealed record FeedbackSubmissionResult(bool IsSuccess, string? ErrorMessage = null)
{
    public static FeedbackSubmissionResult Success() => new(true);
    public static FeedbackSubmissionResult Failed(string message) => new(false, message);
}
