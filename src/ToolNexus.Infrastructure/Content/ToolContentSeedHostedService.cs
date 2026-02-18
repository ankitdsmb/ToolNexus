using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using ToolNexus.Application.Services;
using ToolNexus.Infrastructure.Content.Entities;
using ToolNexus.Infrastructure.Data;

namespace ToolNexus.Infrastructure.Content;

public sealed class ToolContentSeedHostedService(
    IServiceProvider serviceProvider,
    IToolManifestRepository manifestRepository) : IHostedService
{
    public async Task StartAsync(CancellationToken cancellationToken)
    {
        using var scope = serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ToolNexusContentDbContext>();
        if (dbContext.Database.GetMigrations().Any())
        {
            await dbContext.Database.MigrateAsync(cancellationToken);
        }
        else
        {
            await dbContext.Database.EnsureCreatedAsync(cancellationToken);
        }

        if (await dbContext.ToolContents.AnyAsync(cancellationToken))
        {
            return;
        }

        var tools = manifestRepository.LoadTools();
        var toolsByCategory = tools.ToLookup(t => t.Category, StringComparer.OrdinalIgnoreCase);

        var toolEntities = new List<ToolContentEntity>(tools.Count);

        foreach (var tool in tools)
        {
            toolEntities.Add(new ToolContentEntity
            {
                Slug = tool.Slug,
                Title = tool.Title,
                ShortDescription = tool.SeoDescription,
                LongArticle = $"{tool.Title} helps developers transform and validate content quickly. This content can be expanded in the CMS.",
                MetaTitle = tool.SeoTitle,
                MetaDescription = tool.SeoDescription,
                Keywords = $"{tool.Title}, {tool.Category}, developer tools",
                Features = tool.Actions.Select((action, index) => new ToolFeatureEntity { Value = action, SortOrder = index }).ToList(),
                Faqs =
                [
                    new ToolFaqEntity
                    {
                        Question = $"What does {tool.Title} do?",
                        Answer = tool.SeoDescription,
                        SortOrder = 0
                    }
                ],
                RelatedTools = toolsByCategory[tool.Category]
                    .Where(x => x.Slug != tool.Slug)
                    .Take(3)
                    .Select((x, index) => new ToolRelatedEntity { RelatedSlug = x.Slug, SortOrder = index })
                    .ToList()
            });
        }

        dbContext.ToolContents.AddRange(toolEntities);

        var categories = tools.Select(x => x.Category).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        foreach (var category in categories)
        {
            dbContext.ToolCategories.Add(new ToolCategoryEntity
            {
                Slug = category.Trim().ToLowerInvariant(),
                Name = category
            });
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
