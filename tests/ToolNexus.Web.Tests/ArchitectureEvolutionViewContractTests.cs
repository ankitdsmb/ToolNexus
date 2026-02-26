using Xunit;

namespace ToolNexus.Web.Tests;

public sealed class ArchitectureEvolutionViewContractTests
{
    [Fact]
    public void ArchitectureEvolutionView_UsesExpectedEndpointsAndPanels()
    {
        var repoRoot = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../.."));
        var viewPath = Path.Combine(repoRoot, "src", "ToolNexus.Web", "Areas", "Admin", "Views", "ArchitectureEvolution", "Index.cshtml");
        var view = File.ReadAllText(viewPath);

        Assert.Contains("/api/admin/architecture/evolution/dashboard", view, StringComparison.Ordinal);
        Assert.Contains("Drift Alerts", view, StringComparison.Ordinal);
        Assert.Contains("Evolution Suggestions", view, StringComparison.Ordinal);
        Assert.Contains("Migration Impact Simulation", view, StringComparison.Ordinal);
        Assert.Contains("Platform Growth Forecast", view, StringComparison.Ordinal);
        Assert.Contains("Architectural Debt Tracker", view, StringComparison.Ordinal);
    }
}
