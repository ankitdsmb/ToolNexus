namespace ToolNexus.Application.Services;

public interface ISitemapService
{
    Task<string> BuildSitemapAsync(string baseUrl, CancellationToken cancellationToken = default);
}
