namespace ToolNexus.Web.Models;

public sealed class RoadmapPageViewModel
{
    public IReadOnlyList<RoadmapItemCardViewModel> Planned { get; init; } = [];
    public IReadOnlyList<RoadmapItemCardViewModel> InProgress { get; init; } = [];
    public IReadOnlyList<RoadmapItemCardViewModel> Completed { get; init; } = [];
}

public sealed class RoadmapItemCardViewModel
{
    public int Id { get; init; }
    public string Title { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public string Category { get; init; } = string.Empty;
    public string Status { get; init; } = string.Empty;
    public string Priority { get; init; } = string.Empty;
    public int Votes { get; init; }
    public DateTime CreatedAt { get; init; }
}
