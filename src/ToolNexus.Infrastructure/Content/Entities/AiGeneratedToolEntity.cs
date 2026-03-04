namespace ToolNexus.Infrastructure.Content.Entities;

public sealed class AiGeneratedToolEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Prompt { get; set; } = string.Empty;
    public string Schema { get; set; } = string.Empty;
    public string Manifest { get; set; } = string.Empty;
    public string Status { get; set; } = "draft";
}
