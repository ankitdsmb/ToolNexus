using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ToolNexus.Api.Controllers.Marketplace;

[ApiController]
[Route("api/marketplace/tools")]
[Authorize]
public sealed class ToolPublishController(ToolSubmissionService toolSubmissionService) : ControllerBase
{
    [HttpPost("publish")]
    public async Task<ActionResult<ToolPublishResponse>> PublishAsync(
        [FromBody] ToolPublishRequest request,
        CancellationToken cancellationToken = default)
    {
        var authorId = User.FindFirstValue(ClaimTypes.NameIdentifier)
                       ?? User.FindFirstValue("sub")
                       ?? User.Identity?.Name
                       ?? "unknown";

        var result = await toolSubmissionService.SubmitAsync(request, authorId, cancellationToken);

        if (!result.IsSuccess)
        {
            return ValidationProblem(new ValidationProblemDetails(
                result.Errors.ToDictionary(error => error, _ => new[] { "invalid" }))
            {
                Title = "Submission validation failed."
            });
        }

        return Accepted(new ToolPublishResponse(
            result.SubmissionId!.Value,
            result.Status!,
            result.SubmittedAt!.Value,
            "Submission received and queued for moderation. Tool activation requires approval."));
    }
}

public sealed record ToolPublishResponse(Guid Id, string Status, DateTimeOffset SubmittedAt, string Message);
