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
        await dbContext.Database.MigrateAsync(cancellationToken);

        if (await dbContext.ToolContents.AnyAsync(cancellationToken))
        {
            return;
        }

        var tools = manifestRepository.LoadTools();
        foreach (var tool in tools)
        {
            dbContext.ToolContents.Add(new ToolContentEntity
            {
                Slug = tool.Slug,
                Title = tool.Title,
                SeoTitle = tool.SeoTitle,
                SeoDescription = tool.SeoDescription,
                Intro = tool.SeoDescription,
                LongDescription = $"{tool.Title} is designed for fast, no-surprise transformations directly in the browser. It keeps source data local, provides clear output, and supports repeatable developer workflows without requiring a separate desktop utility.",
                Keywords = $"{tool.Title}, {tool.Category}, developer tools",
                Features = tool.Actions.Select((action, index) => new ToolFeatureEntity { Value = action, SortOrder = index }).ToList(),
                Steps =
                [
                    new ToolStepEntity { Title = "Paste or upload source input", Description = "Add the payload you want to process and keep sensitive data redacted when sharing.", SortOrder = 0 },
                    new ToolStepEntity { Title = "Select execution options", Description = "Choose formatting, validation, or conversion options relevant to your stack.", SortOrder = 1 },
                    new ToolStepEntity { Title = "Run and verify output", Description = "Inspect generated output, copy results, and run again with small adjustments.", SortOrder = 2 }
                ],
                Examples =
                [
                    new ToolExampleEntity
                    {
                        Title = "Fix payload before shipping",
                        Input = tool.ExampleInput,
                        Output = "Clean, validated output that can be pasted into production workflows.",
                        SortOrder = 0
                    }
                ],
                Faq =
                [
                    new ToolFaqEntity
                    {
                        Question = $"What does {tool.Title} do?",
                        Answer = tool.SeoDescription,
                        SortOrder = 0
                    }
                ],
                UseCases =
                [
                    new ToolUseCaseEntity { Value = "Debug malformed payloads during API integration.", SortOrder = 0 },
                    new ToolUseCaseEntity { Value = "Normalize test fixtures before adding them to CI regression suites.", SortOrder = 1 }
                ],
                RelatedTools = tools.Where(x => x.Category.Equals(tool.Category, StringComparison.OrdinalIgnoreCase) && x.Slug != tool.Slug)
                    .Take(3)
                    .Select((x, index) => new ToolRelatedEntity { RelatedSlug = x.Slug, SortOrder = index })
                    .ToList()
            });
        }

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
