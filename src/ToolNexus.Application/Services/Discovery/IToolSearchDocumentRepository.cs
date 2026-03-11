using ToolNexus.Application.Contracts;

namespace ToolNexus.Application.Services.Discovery;

public interface IToolSearchDocumentRepository
{
    Task<int> CountAsync(IReadOnlyCollection<string> tokens, CancellationToken cancellationToken = default);

    Task<IReadOnlyCollection<ToolSearchDocument>> FetchPageAsync(
        IReadOnlyCollection<string> tokens,
        int skip,
        int take,
        CancellationToken cancellationToken = default);
}

public sealed record ToolSearchDocument(
    string Slug,
    string Title,
    string Category,
    string Description,
    string Keywords,
    ToolCatalogItemDto Item);
