namespace ToolNexus.Application.Options;

public sealed class ToolResultCacheOptions
{
    public const string SectionName = "ToolResultCache";

    public int MaxEntries { get; set; } = 500;
}
