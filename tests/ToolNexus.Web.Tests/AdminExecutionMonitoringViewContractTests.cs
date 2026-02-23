using Xunit;

namespace ToolNexus.Web.Tests;

public sealed class AdminExecutionMonitoringViewContractTests
{
    [Fact]
    public void ExecutionMonitoringView_UsesExpectedAdminExecutionApiEndpoints()
    {
        var repoRoot = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../../"));
        var viewPath = Path.Combine(repoRoot, "src", "ToolNexus.Web", "Areas", "Admin", "Views", "ExecutionMonitoring", "Index.cshtml");
        var source = File.ReadAllText(viewPath);

        Assert.Contains("fetch('/admin/execution/health')", source, StringComparison.Ordinal);
        Assert.Contains("fetch('/admin/execution/workers')", source, StringComparison.Ordinal);
        Assert.Contains("fetch(`/admin/execution/incidents?page=${page}&pageSize=${pageSize}`)", source, StringComparison.Ordinal);
        Assert.Contains("id=\"refresh-monitoring\"", source, StringComparison.Ordinal);
        Assert.Contains("id=\"jump-workers\"", source, StringComparison.Ordinal);
        Assert.Contains("id=\"jump-incidents\"", source, StringComparison.Ordinal);
    }
}
