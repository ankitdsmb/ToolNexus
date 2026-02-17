namespace ToolNexus.Infrastructure.Content.Entities;

public sealed class ToolContentEntity
{
    public int Id { get; set; }
    public required string Slug { get; set; }
    public required string Title { get; set; }
    public required string ShortDescription { get; set; }
    public required string LongArticle { get; set; }
    public required string MetaTitle { get; set; }
    public required string MetaDescription { get; set; }
    public required string Keywords { get; set; }

    public List<ToolFeatureEntity> Features { get; set; } = [];
    public List<ToolFaqEntity> Faqs { get; set; } = [];
    public List<ToolRelatedEntity> RelatedTools { get; set; } = [];
}

public sealed class ToolFeatureEntity
{
    public int Id { get; set; }
    public int ToolContentId { get; set; }
    public required string Value { get; set; }
    public int SortOrder { get; set; }
    public ToolContentEntity? ToolContent { get; set; }
}

public sealed class ToolFaqEntity
{
    public int Id { get; set; }
    public int ToolContentId { get; set; }
    public required string Question { get; set; }
    public required string Answer { get; set; }
    public int SortOrder { get; set; }
    public ToolContentEntity? ToolContent { get; set; }
}

public sealed class ToolCategoryEntity
{
    public int Id { get; set; }
    public required string Slug { get; set; }
    public required string Name { get; set; }
}

public sealed class ToolRelatedEntity
{
    public int Id { get; set; }
    public int ToolContentId { get; set; }
    public required string RelatedSlug { get; set; }
    public int SortOrder { get; set; }
    public ToolContentEntity? ToolContent { get; set; }
}
