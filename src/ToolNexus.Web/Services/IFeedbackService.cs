using ToolNexus.Web.Models;

namespace ToolNexus.Web.Services;

public interface IFeedbackService
{
    Task<FeedbackSubmissionResult> SubmitAsync(FeedbackSubmissionViewModel model, string? remoteIpAddress, CancellationToken cancellationToken);
}
