using Microsoft.AspNetCore.Mvc;

namespace ToolNexus.Web.Pages.Marketplace;

[ApiController]
public sealed class MarketplaceController(MarketplaceService marketplaceService) : ControllerBase
{
    [HttpGet("/marketplace")]
    public async Task<IActionResult> GetCatalog(
        [FromQuery] string? category,
        [FromQuery] string? sort,
        CancellationToken cancellationToken)
    {
        var sortMode = ParseSort(sort);
        var tools = await marketplaceService.GetCatalogAsync(category, sortMode, cancellationToken);

        return Ok(new
        {
            sort = sortMode.ToString().ToLowerInvariant(),
            category,
            tools
        });
    }

    private static MarketplaceSort ParseSort(string? sort) => sort?.Trim().ToLowerInvariant() switch
    {
        "popularity" => MarketplaceSort.Popularity,
        "newest" => MarketplaceSort.Newest,
        _ => MarketplaceSort.Category
    };
}
