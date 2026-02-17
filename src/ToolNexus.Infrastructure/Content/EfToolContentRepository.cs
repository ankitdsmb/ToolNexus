using Microsoft.EntityFrameworkCore;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Infrastructure.Data;

namespace ToolNexus.Infrastructure.Content;

public sealed class EfToolContentRepository(ToolNexusContentDbContext dbContext) : IToolContentRepository
{
    public async Task<ToolContent?> GetBySlugAsync(string slug, CancellationToken cancellationToken = default)
    {
        var normalizedSlug = slug.Trim().ToLowerInvariant();

        var entity = await dbContext.ToolContents
            .AsNoTracking()
            .Include(x => x.Features)
            .Include(x => x.Faqs)
            .Include(x => x.RelatedTools)
            .Where(x => x.Slug == normalizedSlug)
            .FirstOrDefaultAsync(cancellationToken);

        if (entity is null)
        {
            return null;
        }

        return new ToolContent
        {
            Id = entity.Id,
            Slug = entity.Slug,
            Title = entity.Title,
            ShortDescription = entity.ShortDescription,
            LongArticle = entity.LongArticle,
            MetaTitle = entity.MetaTitle,
            MetaDescription = entity.MetaDescription,
            Keywords = entity.Keywords,
            Features = entity.Features.OrderBy(f => f.SortOrder).Select(f => f.Value).ToArray(),
            Faqs = entity.Faqs.OrderBy(f => f.SortOrder).Select(f => new ToolFaq
            {
                Id = f.Id,
                Slug = entity.Slug,
                Question = f.Question,
                Answer = f.Answer,
                SortOrder = f.SortOrder
            }).ToArray(),
            RelatedTools = entity.RelatedTools.OrderBy(r => r.SortOrder).Select(r => new ToolRelated
            {
                Id = r.Id,
                Slug = entity.Slug,
                RelatedSlug = r.RelatedSlug,
                SortOrder = r.SortOrder
            }).ToArray()
        };
    }

    public async Task<IReadOnlyCollection<string>> GetAllSlugsAsync(CancellationToken cancellationToken = default)
    {
        return await dbContext.ToolContents.AsNoTracking().Select(x => x.Slug).ToArrayAsync(cancellationToken);
    }
}
