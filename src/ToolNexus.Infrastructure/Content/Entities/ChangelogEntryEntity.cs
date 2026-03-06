namespace ToolNexus.Infrastructure.Content.Entities;

public sealed class ChangelogEntryEntity
{
    public Guid Id { get; set; }
    public string Version { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Tag { get; set; } = string.Empty;
    public DateTimeOffset ReleaseDate { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
