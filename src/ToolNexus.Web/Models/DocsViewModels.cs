namespace ToolNexus.Web.Models;

public sealed record DocsIndexViewModel(IReadOnlyList<DocsIndexItemViewModel> Pages);

public sealed record DocsIndexItemViewModel(string Slug, string Title);

public sealed record DocsPageViewModel(string Slug, string Title, string Markdown);
