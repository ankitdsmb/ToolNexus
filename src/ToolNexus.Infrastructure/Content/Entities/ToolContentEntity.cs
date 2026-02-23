namespace ToolNexus.Infrastructure.Content.Entities;

public sealed class ToolContentEntity
{
    public int Id { get; set; }
    public required string Slug { get; set; }
    public required string Title { get; set; }
    public required string SeoTitle { get; set; }
    public required string SeoDescription { get; set; }
    public required string Intro { get; set; }
    public required string LongDescription { get; set; }
    public required string Keywords { get; set; }
    public byte[]? RowVersion { get; set; }

    public List<ToolFeatureEntity> Features { get; set; } = [];
    public List<ToolStepEntity> Steps { get; set; } = [];
    public List<ToolExampleEntity> Examples { get; set; } = [];
    public List<ToolFaqEntity> Faq { get; set; } = [];
    public List<ToolRelatedEntity> RelatedTools { get; set; } = [];
    public List<ToolUseCaseEntity> UseCases { get; set; } = [];
}

public sealed class ToolFeatureEntity
{
    public int Id { get; set; }
    public int ToolContentId { get; set; }
    public required string Value { get; set; }
    public int SortOrder { get; set; }
    public ToolContentEntity? ToolContent { get; set; }
}

public sealed class ToolStepEntity
{
    public int Id { get; set; }
    public int ToolContentId { get; set; }
    public required string Title { get; set; }
    public required string Description { get; set; }
    public int SortOrder { get; set; }
    public ToolContentEntity? ToolContent { get; set; }
}

public sealed class ToolExampleEntity
{
    public int Id { get; set; }
    public int ToolContentId { get; set; }
    public required string Title { get; set; }
    public required string Input { get; set; }
    public required string Output { get; set; }
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

public sealed class ToolUseCaseEntity
{
    public int Id { get; set; }
    public int ToolContentId { get; set; }
    public required string Value { get; set; }
    public int SortOrder { get; set; }
    public ToolContentEntity? ToolContent { get; set; }
}
