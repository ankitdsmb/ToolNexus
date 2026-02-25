using Xunit;

namespace ToolNexus.Web.Tests;

public sealed class GovernanceDecisionViewContractTests
{
    [Fact]
    public void GovernanceDecisionView_UsesExpectedGovernanceEndpointAndFilters()
    {
        var repoRoot = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../.."));
        var viewPath = Path.Combine(repoRoot, "src", "ToolNexus.Web", "Areas", "Admin", "Views", "Governance", "Index.cshtml");
        var view = File.ReadAllText(viewPath);

        Assert.Contains("/api/admin/governance/decisions", view, StringComparison.Ordinal);
        Assert.Contains("tool-filter", view, StringComparison.Ordinal);
        Assert.Contains("policy-filter", view, StringComparison.Ordinal);
        Assert.Contains("start-date", view, StringComparison.Ordinal);
        Assert.Contains("end-date", view, StringComparison.Ordinal);
    }
}
