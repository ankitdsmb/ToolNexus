using Xunit;

namespace ToolNexus.Web.Tests;

public sealed class QualityScoreViewContractTests
{
    [Fact]
    public void QualityScoreView_UsesExpectedQualityEndpointAndFilters()
    {
        var repoRoot = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../.."));
        var viewPath = Path.Combine(repoRoot, "src", "ToolNexus.Web", "Areas", "Admin", "Views", "QualityScores", "Index.cshtml");
        var view = File.ReadAllText(viewPath);

        Assert.Contains("/api/admin/governance/quality-scores", view, StringComparison.Ordinal);
        Assert.Contains("tool-filter", view, StringComparison.Ordinal);
        Assert.Contains("start-date", view, StringComparison.Ordinal);
        Assert.Contains("end-date", view, StringComparison.Ordinal);
    }
}
