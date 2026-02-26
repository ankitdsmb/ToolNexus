using Xunit;

namespace ToolNexus.Web.Tests;

public sealed class CapabilityMarketplaceViewContractTests
{
    [Fact]
    public void CapabilityMarketplaceView_UsesExpectedEndpointAndFilters()
    {
        var repoRoot = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../.."));
        var viewPath = Path.Combine(repoRoot, "src", "ToolNexus.Web", "Areas", "Admin", "Views", "CapabilityMarketplace", "Index.cshtml");
        var view = File.ReadAllText(viewPath);

        Assert.Contains("/api/admin/capabilities/marketplace", view, StringComparison.Ordinal);
        Assert.Contains("tool-filter", view, StringComparison.Ordinal);
        Assert.Contains("status-filter", view, StringComparison.Ordinal);
        Assert.Contains("synced-after", view, StringComparison.Ordinal);
    }
}
