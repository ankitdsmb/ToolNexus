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
        Assert.Contains("fetch('/admin/execution/stream?take=25')", source, StringComparison.Ordinal);
        Assert.Contains("fetch('/admin/execution/governance')", source, StringComparison.Ordinal);
        Assert.Contains("fetch('/admin/execution/capability-lifecycle')", source, StringComparison.Ordinal);
        Assert.Contains("fetch('/admin/execution/quality')", source, StringComparison.Ordinal);
        Assert.Contains("fetch(`/admin/execution/incidents?page=${page}&pageSize=${pageSize}`)", source, StringComparison.Ordinal);
        Assert.Contains("data-command=\"cache-reset\"", source, StringComparison.Ordinal);
        Assert.Contains("data-command=\"queue-drain\"", source, StringComparison.Ordinal);
        Assert.Contains("data-command=\"queue-replay\"", source, StringComparison.Ordinal);
    }
}
