namespace ToolNexus.Application.Contracts;

public sealed record ToolCatalogItemDto(
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
