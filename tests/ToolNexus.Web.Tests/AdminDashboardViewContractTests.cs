using Xunit;

namespace ToolNexus.Web.Tests;

public sealed class AdminDashboardViewContractTests
{
    [Fact]
    public void Dashboard_ContainsContentOpsWidgets()
    {
        var repoRoot = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../.."));
        var dashboardPath = Path.Combine(repoRoot, "src", "ToolNexus.Web", "Areas", "Admin", "Views", "Dashboard", "Index.cshtml");
        var view = File.ReadAllText(dashboardPath);

        Assert.Contains("Total feedback", view, StringComparison.Ordinal);
        Assert.Contains("Open feedback", view, StringComparison.Ordinal);
        Assert.Contains("Roadmap items", view, StringComparison.Ordinal);
        Assert.Contains("Recent changelog", view, StringComparison.Ordinal);
    }
}
