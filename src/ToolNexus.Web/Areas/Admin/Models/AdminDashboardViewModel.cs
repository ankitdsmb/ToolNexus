namespace ToolNexus.Web.Areas.Admin.Models;

public sealed class AdminDashboardViewModel
{
    public int TotalFeedback { get; init; }
    public int OpenFeedback { get; init; }
    public int RoadmapItems { get; init; }
    public IReadOnlyList<AdminRecentChangelogItemViewModel> RecentChangelog { get; init; } = [];
}

public sealed record AdminRecentChangelogItemViewModel(string Version, string Title, DateTimeOffset ReleaseDate);
