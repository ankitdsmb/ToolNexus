using Microsoft.EntityFrameworkCore;
using ToolNexus.Infrastructure.Content.Entities;
using ToolNexus.Infrastructure.Data;

namespace ToolNexus.Api.Controllers.Marketplace;

public sealed class ToolSubmissionService(
    ToolNexusContentDbContext dbContext,
    ToolSubmissionValidator validator,
    TimeProvider timeProvider)
{
    public async Task<ToolPublishResult> SubmitAsync(ToolPublishRequest request, string authorId, CancellationToken cancellationToken)
    {
        var errors = validator.Validate(request);
        if (errors.Count > 0)
        {
            return ToolPublishResult.ValidationFailed(errors);
        }

        var slugTaken = await dbContext.ToolContents.AnyAsync(t => t.Slug == request.Slug, cancellationToken) ||
                        await dbContext.ToolSubmissions.AnyAsync(t => t.Slug == request.Slug, cancellationToken);

        if (slugTaken)
        {
            return ToolPublishResult.ValidationFailed(["slug is already in use."]);
        }

        var submittedAt = timeProvider.GetUtcNow();

        var entity = new ToolSubmissionEntity
        {
            Id = Guid.NewGuid(),
            Slug = request.Slug,
            AuthorId = authorId,
            Status = ToolSubmissionStatus.Pending,
            SubmittedAt = submittedAt,
            Manifest = request.Manifest,
            Schema = request.Schema,
            RuntimeModule = request.RuntimeModule,
            Template = request.Template
        };

        dbContext.ToolSubmissions.Add(entity);
        await dbContext.SaveChangesAsync(cancellationToken);

        return ToolPublishResult.Success(entity.Id, entity.Status, submittedAt);
    }
}

public sealed record ToolPublishRequest(
    string Slug,
    string Manifest,
    string Schema,
    string RuntimeModule,
    string Template);

public sealed record ToolPublishResult(
    bool IsSuccess,
    Guid? SubmissionId,
    string? Status,
    DateTimeOffset? SubmittedAt,
    IReadOnlyList<string> Errors)
{
    public static ToolPublishResult Success(Guid submissionId, string status, DateTimeOffset submittedAt) =>
        new(true, submissionId, status, submittedAt, []);

    public static ToolPublishResult ValidationFailed(IReadOnlyList<string> errors) =>
        new(false, null, null, null, errors);
}
