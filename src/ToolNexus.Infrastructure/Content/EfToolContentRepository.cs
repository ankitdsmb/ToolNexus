using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Infrastructure.Data;

namespace ToolNexus.Infrastructure.Content;

public sealed class EfToolContentRepository(
    ToolNexusContentDbContext dbContext,
    ILogger<EfToolContentRepository> logger) : IToolContentRepository
{
    public async Task<ToolContent?> GetBySlugAsync(string slug, CancellationToken cancellationToken = default)
    {
        var normalizedSlug = slug.Trim().ToLowerInvariant();

        try
        {
            var entity = await dbContext.ToolContents
                .AsNoTracking()
                .Include(x => x.Features)
                .Include(x => x.Steps)
                .Include(x => x.Examples)
                .Include(x => x.Faq)
                .Include(x => x.RelatedTools)
                .Include(x => x.UseCases)
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
                SeoTitle = entity.SeoTitle,
                SeoDescription = entity.SeoDescription,
                Intro = entity.Intro,
                LongDescription = entity.LongDescription,
                Keywords = entity.Keywords,
                Features = entity.Features.OrderBy(f => f.SortOrder).Select(f => f.Value).ToArray(),
                Steps = entity.Steps.OrderBy(s => s.SortOrder).Select(s => new ToolStep
                {
                    Id = s.Id,
                    Slug = entity.Slug,
                    Title = s.Title,
                    Description = s.Description,
                    SortOrder = s.SortOrder
                }).ToArray(),
                Examples = entity.Examples.OrderBy(example => example.SortOrder).Select(example => new ToolExample
                {
                    Id = example.Id,
                    Slug = entity.Slug,
                    Title = example.Title,
                    Input = example.Input,
                    Output = example.Output,
                    SortOrder = example.SortOrder
                }).ToArray(),
                Faq = entity.Faq.OrderBy(f => f.SortOrder).Select(f => new ToolFaq
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
                }).ToArray(),
                UseCases = entity.UseCases.OrderBy(uc => uc.SortOrder).Select(uc => uc.Value).ToArray()
            };
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Falling back to manifest-only rendering because tool content repository is unavailable for slug {Slug}.", normalizedSlug);
            return null;
        }
    }

    public async Task<IReadOnlyCollection<string>> GetAllSlugsAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            return await dbContext.ToolContents.AsNoTracking().Select(x => x.Slug).ToArrayAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Returning empty tool content slug list because tool content repository is unavailable.");
            return [];
        }
    }
}
