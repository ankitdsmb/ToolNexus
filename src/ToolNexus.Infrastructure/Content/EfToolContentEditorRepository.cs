using Microsoft.EntityFrameworkCore;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Infrastructure.Content.Entities;
using ToolNexus.Infrastructure.Data;

namespace ToolNexus.Infrastructure.Content;

public sealed class EfToolContentEditorRepository(ToolNexusContentDbContext dbContext, IAdminAuditLogger auditLogger) : IToolContentEditorRepository
{
    public async Task<ToolContentEditorGraph?> GetGraphByToolIdAsync(int toolId, CancellationToken cancellationToken = default)
    {
        var tool = await dbContext.ToolDefinitions.AsNoTracking().SingleOrDefaultAsync(x => x.Id == toolId, cancellationToken);
        if (tool is null) return null;

        var content = await dbContext.ToolContents
            .AsNoTracking()
            .Include(x => x.Features)
            .Include(x => x.Steps)
            .Include(x => x.Examples)
            .Include(x => x.Faq)
            .Include(x => x.UseCases)
            .Include(x => x.RelatedTools)
            .SingleOrDefaultAsync(x => x.Slug == tool.Slug, cancellationToken);

        var relatedOptions = await dbContext.ToolDefinitions
            .AsNoTracking()
            .Where(x => x.Slug != tool.Slug)
            .OrderBy(x => x.Name)
            .Select(x => new RelatedToolOption(x.Slug, x.Name))
            .ToArrayAsync(cancellationToken);

        if (content is null)
        {
            return new ToolContentEditorGraph(tool.Id, tool.Slug, tool.Name, [], [], [], [], [], [], relatedOptions);
        }

        return new ToolContentEditorGraph(
            tool.Id,
            tool.Slug,
            tool.Name,
            content.Features.OrderBy(x => x.SortOrder).Select(x => new ContentValueItem(x.Id, x.Value, x.SortOrder)).ToArray(),
            content.Steps.OrderBy(x => x.SortOrder).Select(x => new ContentStepItem(x.Id, x.Title, x.Description, x.SortOrder)).ToArray(),
            content.Examples.OrderBy(x => x.SortOrder).Select(x => new ContentExampleItem(x.Id, x.Title, x.Input, x.Output, x.SortOrder)).ToArray(),
            content.Faq.OrderBy(x => x.SortOrder).Select(x => new ContentFaqItem(x.Id, x.Question, x.Answer, x.SortOrder)).ToArray(),
            content.UseCases.OrderBy(x => x.SortOrder).Select(x => new ContentValueItem(x.Id, x.Value, x.SortOrder)).ToArray(),
            content.RelatedTools.OrderBy(x => x.SortOrder).Select(x => new ContentRelatedItem(x.Id, x.RelatedSlug, x.SortOrder)).ToArray(),
            relatedOptions);
    }

    public async Task<bool> SaveGraphAsync(int toolId, SaveToolContentGraphRequest request, CancellationToken cancellationToken = default)
    {
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
                Keywords = tool.Name
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

        await dbContext.SaveChangesAsync(cancellationToken);
        await auditLogger.TryLogAsync(
            "FeatureFlagChanged",
            "ToolContent",
            content.Id.ToString(),
            before: null,
            after: new { FeatureCount = content.Features.Count, UseCaseCount = content.UseCases.Count },
            cancellationToken);
        return true;
    }

    public async Task<IReadOnlyCollection<string>> GetDefinitionSlugsAsync(CancellationToken cancellationToken = default)
        => await dbContext.ToolDefinitions.AsNoTracking().Select(x => x.Slug).ToArrayAsync(cancellationToken);
}
