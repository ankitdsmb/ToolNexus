using ToolNexus.Application.Contracts;

namespace ToolNexus.Application.Services;

public sealed class DiscoveryService(IToolSearchService toolSearchService)
{
    public Task<ToolSearchResultDto> SearchAsync(string? query, int page, int pageSize, CancellationToken cancellationToken = default)
        => toolSearchService.SearchAsync(query, page, pageSize, cancellationToken);
}
