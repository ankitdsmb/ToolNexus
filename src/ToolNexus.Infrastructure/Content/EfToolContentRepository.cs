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

        return await dbContext.ToolContents
            .AsNoTracking()
            .Where(x => x.Slug == normalizedSlug)
            .Select(x => new ToolContent
            {
                Id = x.Id,
                Slug = x.Slug,
                Title = x.Title,
                ShortDescription = x.ShortDescription,
                LongArticle = x.LongArticle,
                MetaTitle = x.MetaTitle,
                MetaDescription = x.MetaDescription,
                Keywords = x.Keywords,
                Features = x.Features.OrderBy(f => f.SortOrder).Select(f => f.Value).ToArray(),
                Faqs = x.Faqs.OrderBy(f => f.SortOrder).Select(f => new ToolFaq
                {
                    Id = f.Id,
                    Slug = x.Slug,
                    Question = f.Question,
                    Answer = f.Answer,
                    SortOrder = f.SortOrder
                }).ToArray(),
                RelatedTools = x.RelatedTools.OrderBy(r => r.SortOrder).Select(r => new ToolRelated
                {
                    Id = r.Id,
                    Slug = x.Slug,
                    RelatedSlug = r.RelatedSlug,
                    SortOrder = r.SortOrder
                }).ToArray()
            })
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<IReadOnlyCollection<string>> GetAllSlugsAsync(CancellationToken cancellationToken = default)
    {
        return await dbContext.ToolContents.AsNoTracking().Select(x => x.Slug).ToArrayAsync(cancellationToken);
    }
}
