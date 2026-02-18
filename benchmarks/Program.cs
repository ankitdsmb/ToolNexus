using System.Diagnostics;
using ToolNexus.Application.Models;
using ToolNexus.Infrastructure.Content.Entities;

namespace benchmarks;

public class Program
{
    public static void Main(string[] args)
    {
        Console.WriteLine("Generating tools...");
        var count = 5000;
        var tools = GenerateTools(count);
        Console.WriteLine($"Generated {tools.Count} tools.");

        // Worst case: No related tools found, so it scans the whole list every time.
        // Or finding related tools takes a long time.

        Console.WriteLine("Running Inefficient...");
        var sw = Stopwatch.StartNew();
        RunInefficient(tools);
        sw.Stop();
        Console.WriteLine($"Inefficient took: {sw.ElapsedMilliseconds}ms");

        Console.WriteLine("Running Optimized...");
        sw = Stopwatch.StartNew();
        RunOptimized(tools);
        sw.Stop();
        Console.WriteLine($"Optimized took: {sw.ElapsedMilliseconds}ms");
    }

    private static List<ToolDescriptor> GenerateTools(int count)
    {
        var list = new List<ToolDescriptor>();
        var random = new Random(42);

        for (int i = 0; i < count; i++)
        {
            // Use many categories to force deeper scans if we want, or just unique ones.
            // If unique, it scans everything and finds nothing. O(N^2).
            list.Add(new ToolDescriptor
            {
                Slug = $"tool-{i}",
                Title = $"Tool {i}",
                Category = $"Category-{i}", // Unique category for each tool
                Actions = new List<string> { "Action1", "Action2" },
                SeoTitle = $"SEO Title {i}",
                SeoDescription = $"SEO Description {i}",
                ExampleInput = "input",
                ClientSafeActions = new List<string>(),
                Version = "1.0.0",
                IsDeterministic = true,
                IsCpuIntensive = false,
                IsCacheable = true,
                SecurityLevel = "Medium",
                RequiresAuthentication = false,
                IsDeprecated = false
            });
        }
        return list;
    }

    private static void RunInefficient(List<ToolDescriptor> tools)
    {
        var entities = new List<ToolContentEntity>();
        foreach (var tool in tools)
        {
            entities.Add(new ToolContentEntity
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
                RelatedTools = tools.Where(x => x.Category.Equals(tool.Category, StringComparison.OrdinalIgnoreCase) && x.Slug != tool.Slug)
                    .Take(3)
                    .Select((x, index) => new ToolRelatedEntity { RelatedSlug = x.Slug, SortOrder = index })
                    .ToList()
            });
        }
    }

    private static void RunOptimized(List<ToolDescriptor> tools)
    {
        var entities = new List<ToolContentEntity>();

        // Group tools by category beforehand to avoid O(N^2) lookup
        var toolsByCategory = tools
            .GroupBy(t => t.Category, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.ToList(), StringComparer.OrdinalIgnoreCase);

        foreach (var tool in tools)
        {
            var relatedTools = new List<ToolRelatedEntity>();
            if (toolsByCategory.TryGetValue(tool.Category, out var catTools))
            {
                relatedTools = catTools
                    .Where(x => x.Slug != tool.Slug)
                    .Take(3)
                    .Select((x, index) => new ToolRelatedEntity { RelatedSlug = x.Slug, SortOrder = index })
                    .ToList();
            }

            entities.Add(new ToolContentEntity
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
                RelatedTools = relatedTools
            });
        }
    }
}
