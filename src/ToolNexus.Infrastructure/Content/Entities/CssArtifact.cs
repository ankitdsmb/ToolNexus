namespace ToolNexus.Infrastructure.Content.Entities;

public sealed class CssArtifact
{
    public Guid Id { get; set; }
    public Guid ResultId { get; set; }
    public required string ArtifactType { get; set; }
    public required string FilePath { get; set; }
    public required string ContentType { get; set; }
    public required string FileName { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; }

    public CssScanResult? Result { get; set; }
}
