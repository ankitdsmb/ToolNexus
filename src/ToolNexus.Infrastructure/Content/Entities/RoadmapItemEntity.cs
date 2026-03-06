namespace ToolNexus.Infrastructure.Content.Entities;

public sealed class RoadmapItemEntity
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Priority { get; set; } = string.Empty;
    public int Votes { get; set; }
    public DateTime CreatedAt { get; set; }
}
