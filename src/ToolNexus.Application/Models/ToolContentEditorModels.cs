namespace ToolNexus.Application.Models;

public sealed record ToolContentEditorGraph(
    int ToolId,
    string ToolSlug,
    string ToolName,
    IReadOnlyCollection<ContentValueItem> Features,
    IReadOnlyCollection<ContentStepItem> Steps,
    IReadOnlyCollection<ContentExampleItem> Examples,
    IReadOnlyCollection<ContentFaqItem> Faqs,
    IReadOnlyCollection<ContentValueItem> UseCases,
    IReadOnlyCollection<ContentRelatedItem> RelatedTools,
    IReadOnlyCollection<RelatedToolOption> RelatedToolOptions);

public sealed record ContentValueItem(int Id, string Value, int SortOrder);
public sealed record ContentStepItem(int Id, string Title, string Description, int SortOrder);
public sealed record ContentExampleItem(int Id, string Title, string Input, string Output, int SortOrder);
public sealed record ContentFaqItem(int Id, string Question, string Answer, int SortOrder);
public sealed record ContentRelatedItem(int Id, string RelatedSlug, int SortOrder);
public sealed record RelatedToolOption(string Slug, string Name);

public sealed record SaveToolContentGraphRequest(
    IReadOnlyCollection<ContentValueItem> Features,
    IReadOnlyCollection<ContentStepItem> Steps,
    IReadOnlyCollection<ContentExampleItem> Examples,
    IReadOnlyCollection<ContentFaqItem> Faqs,
    IReadOnlyCollection<ContentValueItem> UseCases,
    IReadOnlyCollection<ContentRelatedItem> RelatedTools);
