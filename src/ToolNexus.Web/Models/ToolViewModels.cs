namespace ToolNexus.Web.Models;

public sealed record ToolViewModel(
    string Slug,
    string Title,
    string Category,
    IReadOnlyCollection<string> Actions,
    string SeoTitle,
    string SeoDescription,
    string ExampleInput,
    IReadOnlyCollection<string> ClientSafeActions,
    string Version,
    bool IsDeterministic,
    bool IsCpuIntensive,
    bool IsCacheable,
    string SecurityLevel,
    bool RequiresAuthentication,
    bool IsDeprecated,
    string RuntimeLanguage,
    string ExecutionCapability,
    Dictionary<string, object>? OperationSchema);

public sealed record ToolContentViewModel(
    int Id,
    string Slug,
    string Title,
    string SeoTitle,
    string SeoDescription,
    string Intro,
    string LongDescription,
    string Keywords,
    IReadOnlyCollection<string> Features,
    IReadOnlyCollection<ToolStepViewModel> Steps,
    IReadOnlyCollection<ToolExampleViewModel> Examples,
    IReadOnlyCollection<ToolFaqViewModel> Faq,
    IReadOnlyCollection<ToolRelatedViewModel> RelatedTools,
    IReadOnlyCollection<string> UseCases);

public sealed record ToolStepViewModel(int Id, string Slug, string Title, string Description, int SortOrder);
public sealed record ToolExampleViewModel(int Id, string Slug, string Title, string Input, string Output, int SortOrder);
public sealed record ToolFaqViewModel(int Id, string Slug, string Question, string Answer, int SortOrder);
public sealed record ToolRelatedViewModel(int Id, string Slug, string RelatedSlug, int SortOrder);
