using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Infrastructure.Content.Entities;
using ToolNexus.Infrastructure.Data;

namespace ToolNexus.Infrastructure.Content;

public sealed class EfToolContentEditorRepository(
    ToolNexusContentDbContext dbContext,
    IAdminAuditLogger auditLogger,
    IConcurrencyObservability concurrencyObservability,
    ILogger<EfToolContentEditorRepository> logger) : IToolContentEditorRepository
{
    public async Task<ToolContentEditorGraph?> GetGraphByToolIdAsync(int toolId, CancellationToken cancellationToken = default)
    {
        var tool = await dbContext.ToolDefinitions
            .AsNoTracking()
            .Where(x => x.Id == toolId)
            .Select(x => new { x.Id, x.Slug, x.Name })
            .SingleOrDefaultAsync(cancellationToken);
        if (tool is null)
        {
            return null;
        }

        var contentMeta = await dbContext.ToolContents
            .AsNoTracking()
            .Where(x => x.Slug == tool.Slug)
            .Select(x => new { x.Id, x.RowVersion })
            .SingleOrDefaultAsync(cancellationToken);

        var relatedOptionsTask = dbContext.ToolDefinitions
            .AsNoTracking()
            .Where(x => x.Slug != tool.Slug)
            .OrderBy(x => x.Name)
            .Select(x => new RelatedToolOption(x.Slug, x.Name))
            .ToArrayAsync(cancellationToken);

        if (contentMeta is null)
        {
            var relatedOptions = await relatedOptionsTask;
            return new ToolContentEditorGraph(tool.Id, tool.Slug, tool.Name, [], [], [], [], [], [], relatedOptions, null);
        }

        var contentId = contentMeta.Id;

        var featuresTask = dbContext.ToolFeatures
            .AsNoTracking()
            .Where(x => x.ToolContentId == contentId)
            .OrderBy(x => x.SortOrder)
            .Select(x => new ContentValueItem(x.Id, x.Value, x.SortOrder))
            .ToArrayAsync(cancellationToken);

        var stepsTask = dbContext.ToolSteps
            .AsNoTracking()
            .Where(x => x.ToolContentId == contentId)
            .OrderBy(x => x.SortOrder)
            .Select(x => new ContentStepItem(x.Id, x.Title, x.Description, x.SortOrder))
            .ToArrayAsync(cancellationToken);

        var examplesTask = dbContext.ToolExamples
            .AsNoTracking()
            .Where(x => x.ToolContentId == contentId)
            .OrderBy(x => x.SortOrder)
            .Select(x => new ContentExampleItem(x.Id, x.Title, x.Input, x.Output, x.SortOrder))
            .ToArrayAsync(cancellationToken);

        var faqTask = dbContext.ToolFaqs
            .AsNoTracking()
            .Where(x => x.ToolContentId == contentId)
            .OrderBy(x => x.SortOrder)
            .Select(x => new ContentFaqItem(x.Id, x.Question, x.Answer, x.SortOrder))
            .ToArrayAsync(cancellationToken);

        var useCasesTask = dbContext.ToolUseCases
            .AsNoTracking()
            .Where(x => x.ToolContentId == contentId)
            .OrderBy(x => x.SortOrder)
            .Select(x => new ContentValueItem(x.Id, x.Value, x.SortOrder))
            .ToArrayAsync(cancellationToken);

        var relatedToolsTask = dbContext.ToolRelated
            .AsNoTracking()
            .Where(x => x.ToolContentId == contentId)
            .OrderBy(x => x.SortOrder)
            .Select(x => new ContentRelatedItem(x.Id, x.RelatedSlug, x.SortOrder))
            .ToArrayAsync(cancellationToken);

        await Task.WhenAll(relatedOptionsTask, featuresTask, stepsTask, examplesTask, faqTask, useCasesTask, relatedToolsTask);

        return new ToolContentEditorGraph(
            tool.Id,
            tool.Slug,
            tool.Name,
            featuresTask.Result,
            stepsTask.Result,
            examplesTask.Result,
            faqTask.Result,
            useCasesTask.Result,
            relatedToolsTask.Result,
            relatedOptionsTask.Result,
            ConcurrencyTokenCodec.Encode(contentMeta.RowVersion));
    }

    public async Task<bool> SaveGraphAsync(int toolId, SaveToolContentGraphRequest request, CancellationToken cancellationToken = default)
    {
        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
        var tool = await dbContext.ToolDefinitions.SingleOrDefaultAsync(x => x.Id == toolId, cancellationToken);
        if (tool is null) return false;

        var content = await dbContext.ToolContents
            .Include(x => x.Features)
            .Include(x => x.Steps)
            .Include(x => x.Examples)
            .Include(x => x.Faq)
            .Include(x => x.UseCases)
            .Include(x => x.RelatedTools)
            .SingleOrDefaultAsync(x => x.Slug == tool.Slug, cancellationToken);

        if (content is null)
        {
            content = new ToolContentEntity
            {
                Slug = tool.Slug,
                Title = tool.Name,
                SeoTitle = tool.Name,
                SeoDescription = tool.Description,
                Intro = tool.Description,
                LongDescription = tool.Description,
                Keywords = tool.Name,
                RowVersion = ConcurrencyTokenCodec.NewToken()
            };
            dbContext.ToolContents.Add(content);
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        content.Features.Clear();
        content.UseCases.Clear();
        content.Steps.Clear();
        content.Examples.Clear();
        content.Faq.Clear();
        content.RelatedTools.Clear();

        foreach (var item in request.Features)
            content.Features.Add(new ToolFeatureEntity { ToolContentId = content.Id, Value = item.Value, SortOrder = item.SortOrder });
        foreach (var item in request.UseCases)
            content.UseCases.Add(new ToolUseCaseEntity { ToolContentId = content.Id, Value = item.Value, SortOrder = item.SortOrder });
        foreach (var item in request.Steps)
            content.Steps.Add(new ToolStepEntity { ToolContentId = content.Id, Title = item.Title, Description = item.Description, SortOrder = item.SortOrder });
        foreach (var item in request.Examples)
            content.Examples.Add(new ToolExampleEntity { ToolContentId = content.Id, Title = item.Title, Input = item.Input, Output = item.Output, SortOrder = item.SortOrder });
        foreach (var item in request.Faqs)
            content.Faq.Add(new ToolFaqEntity { ToolContentId = content.Id, Question = item.Question, Answer = item.Answer, SortOrder = item.SortOrder });
        foreach (var item in request.RelatedTools)
            content.RelatedTools.Add(new ToolRelatedEntity { ToolContentId = content.Id, RelatedSlug = item.RelatedSlug, SortOrder = item.SortOrder });

        content.RowVersion = ConcurrencyTokenCodec.NewToken();

        await SaveWithConcurrencyEnforcementAsync(content, request, cancellationToken);

        await auditLogger.TryLogAsync(
            "FeatureFlagChanged",
            "ToolContent",
            content.Id.ToString(),
            before: null,
            after: new { FeatureCount = content.Features.Count, UseCaseCount = content.UseCases.Count },
            cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return true;
    }

    public async Task<IReadOnlyCollection<string>> GetDefinitionSlugsAsync(CancellationToken cancellationToken = default)
        => await dbContext.ToolDefinitions.AsNoTracking().Select(x => x.Slug).ToArrayAsync(cancellationToken);

    private async Task SaveWithConcurrencyEnforcementAsync(ToolContentEntity content, SaveToolContentGraphRequest request, CancellationToken cancellationToken)
    {
        const string resourceType = "ToolContent";
        concurrencyObservability.RecordWriteAttempt(resourceType);

        if (string.IsNullOrWhiteSpace(request.VersionToken))
        {
            concurrencyObservability.RecordMissingVersionToken(resourceType);
            logger.LogWarning("Missing version token for ToolContent {ContentId}; allowing transitional write.", content.Id);
            await auditLogger.TryLogAsync(
                "MissingVersionToken",
                resourceType,
                content.Id.ToString(),
                before: null,
                after: new { content.Slug },
                cancellationToken);
        }
        else
        {
            dbContext.Entry(content).Property(x => x.RowVersion).OriginalValue = ConcurrencyTokenCodec.Decode(request.VersionToken);
        }

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException ex)
        {
            var currentToken = await dbContext.ToolContents.AsNoTracking().Where(x => x.Id == content.Id).Select(x => x.RowVersion).SingleOrDefaultAsync(cancellationToken);
            var serverToken = ConcurrencyTokenCodec.Encode(currentToken);
            concurrencyObservability.RecordConflict(resourceType, request.VersionToken, serverToken);
            concurrencyObservability.RecordStaleUpdateAttempt(resourceType);
            logger.LogWarning(ex, "Optimistic concurrency conflict for ToolContent {ContentId}. clientToken={ClientToken} serverToken={ServerToken} outcome={Outcome}", content.Id, request.VersionToken, serverToken, "rejected_conflict");

            await auditLogger.TryLogAsync(
                "ConcurrencyConflictDetected",
                resourceType,
                content.Id.ToString(),
                new { AttemptedToken = request.VersionToken },
                new { CurrentToken = serverToken },
                cancellationToken);

            throw new OptimisticConcurrencyException(request.VersionToken, ex);
        }
    }

}
