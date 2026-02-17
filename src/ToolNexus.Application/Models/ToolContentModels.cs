namespace ToolNexus.Application.Models;

public sealed class ToolContent
{
    public int Id { get; init; }
    public required string Slug { get; init; }
    public required string Title { get; init; }
    public required string ShortDescription { get; init; }
    public required string LongArticle { get; init; }
    public required string MetaTitle { get; init; }
    public required string MetaDescription { get; init; }
    public required string Keywords { get; init; }
    public IReadOnlyCollection<string> Features { get; init; } = [];
    public IReadOnlyCollection<ToolFaq> Faqs { get; init; } = [];
    public IReadOnlyCollection<ToolRelated> RelatedTools { get; init; } = [];
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
