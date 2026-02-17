namespace ToolNexus.Application.Models;

public sealed class ToolDescriptor
{
    public required string Slug { get; init; }
    public required string Title { get; init; }
    public required string Category { get; init; }
    public required List<string> Actions { get; init; }
    public required string SeoTitle { get; init; }
    public required string SeoDescription { get; init; }
    public required string ExampleInput { get; init; }
    public List<string> ClientSafeActions { get; init; } = [];
}
