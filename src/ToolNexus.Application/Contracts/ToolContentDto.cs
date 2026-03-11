namespace ToolNexus.Application.Contracts;

public sealed record ToolContentDto(
    int Id,
    string Slug,
    string Title,
    string SeoTitle,
    string SeoDescription,
    string Intro,
    string LongDescription,
    string Keywords,
    IReadOnlyCollection<string> Features,
    IReadOnlyCollection<ToolStepDto> Steps,
    IReadOnlyCollection<ToolExampleDto> Examples,
    IReadOnlyCollection<ToolFaqDto> Faq,
    IReadOnlyCollection<ToolRelatedDto> RelatedTools,
    IReadOnlyCollection<string> UseCases);

public sealed record ToolStepDto(int Id, string Slug, string Title, string Description, int SortOrder);
public sealed record ToolExampleDto(int Id, string Slug, string Title, string Input, string Output, int SortOrder);
public sealed record ToolFaqDto(int Id, string Slug, string Question, string Answer, int SortOrder);
public sealed record ToolRelatedDto(int Id, string Slug, string RelatedSlug, int SortOrder);
