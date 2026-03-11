using ToolNexus.Application.Contracts;

namespace ToolNexus.Application.Services;

public interface IToolSearchService
{
    Task<ToolSearchResultDto> SearchAsync(string? query, int page, int pageSize, CancellationToken cancellationToken = default);
}
