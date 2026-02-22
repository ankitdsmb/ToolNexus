namespace ToolNexus.Infrastructure.Content.Entities;

public sealed class ToolDefinitionEntity
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public required string Slug { get; set; }
    public required string Description { get; set; }
    public required string Category { get; set; }
    public required string Status { get; set; }
    public required string Icon { get; set; }
    public int SortOrder { get; set; }
    public required string ActionsCsv { get; set; }
    public required string InputSchema { get; set; }
    public required string OutputSchema { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
