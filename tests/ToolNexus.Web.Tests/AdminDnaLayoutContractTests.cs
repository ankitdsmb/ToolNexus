using Xunit;

namespace ToolNexus.Web.Tests;

public sealed class AdminDnaLayoutContractTests
{
    [Fact]
    public void AdminLayout_ContainsUnifiedAdminDnaStructureAndNavigation()
    {
        var repoRoot = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../.."));
        var layoutPath = Path.Combine(repoRoot, "src", "ToolNexus.Web", "Areas", "Admin", "Views", "Shared", "_AdminLayout.cshtml");
        var layout = File.ReadAllText(layoutPath);

        Assert.Contains("_AdminContextStrip", layout, StringComparison.Ordinal);
        Assert.Contains("_AdminActionBar", layout, StringComparison.Ordinal);
        Assert.Contains("admin-data-workspace", layout, StringComparison.Ordinal);
        Assert.Contains("_AdminAuditBanner", layout, StringComparison.Ordinal);

        Assert.Contains(">Dashboard<", layout, StringComparison.Ordinal);
        Assert.Contains(">Tools<", layout, StringComparison.Ordinal);
        Assert.Contains(">Capabilities<", layout, StringComparison.Ordinal);
        Assert.Contains(">Governance<", layout, StringComparison.Ordinal);
        Assert.Contains(">Executions<", layout, StringComparison.Ordinal);
        Assert.Contains(">Runtime Operations<", layout, StringComparison.Ordinal);
        Assert.Contains(">Quality<", layout, StringComparison.Ordinal);
        Assert.Contains(">Analytics<", layout, StringComparison.Ordinal);
        Assert.Contains(">Feature Flags<", layout, StringComparison.Ordinal);
        Assert.Contains(">Users &amp; Access<", layout, StringComparison.Ordinal);
        Assert.Contains(">System Maintenance<", layout, StringComparison.Ordinal);
    }
}
