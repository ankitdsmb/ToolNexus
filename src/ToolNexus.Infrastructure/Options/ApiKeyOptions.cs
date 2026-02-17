namespace ToolNexus.Infrastructure.Options;

public sealed class ApiKeyOptions
{
    public const string SectionName = "Security:ApiKeys";

    public bool Enabled { get; set; } = true;

    public List<string> Keys { get; set; } = [];
}
