namespace ToolNexus.Application.Contracts;

public sealed record ToolSearchResultDto(
    string Query,
    IReadOnlyCollection<ToolCatalogItemDto> Items,
    int TotalCount);
