namespace ToolNexus.Application.Models;

public sealed class ToolContent
{
    public int Id { get; init; }
    public required string Slug { get; init; }
    public required string Title { get; init; }
    public required string SeoTitle { get; init; }
    public required string SeoDescription { get; init; }
    public required string Intro { get; init; }
    public required string LongDescription { get; init; }
    public required string Keywords { get; init; }
    public IReadOnlyCollection<string> Features { get; init; } = [];
    public IReadOnlyCollection<ToolStep> Steps { get; init; } = [];
    public IReadOnlyCollection<ToolExample> Examples { get; init; } = [];
    public IReadOnlyCollection<ToolFaq> Faq { get; init; } = [];
    public IReadOnlyCollection<ToolRelated> RelatedTools { get; init; } = [];
    public IReadOnlyCollection<string> UseCases { get; init; } = [];

    public string ShortDescription => Intro;
    public string LongArticle => LongDescription;
    public string MetaTitle => SeoTitle;
    public string MetaDescription => SeoDescription;
    public IReadOnlyCollection<ToolFaq> Faqs => Faq;
}

public sealed class ToolStep
{
    public int Id { get; init; }
    public required string Slug { get; init; }
    public required string Title { get; init; }
    public required string Description { get; init; }
    public int SortOrder { get; init; }
}

public sealed class ToolExample
{
    public int Id { get; init; }
    public required string Slug { get; init; }
    public required string Title { get; init; }
    public required string Input { get; init; }
    public required string Output { get; init; }
    public int SortOrder { get; init; }
}

public sealed class ToolFaq
{
    public int Id { get; init; }
    public required string Slug { get; init; }
    public required string Question { get; init; }
    public required string Answer { get; init; }
    public int SortOrder { get; init; }
}

public sealed class ToolRelated
{
    public int Id { get; init; }
    public required string Slug { get; init; }
    public required string RelatedSlug { get; init; }
    public int SortOrder { get; init; }
}

public sealed class ToolCategory
{
    public int Id { get; init; }
    public required string Slug { get; init; }
    public required string Name { get; init; }
}
