namespace ToolNexus.Application.Options;

public sealed class ToolResultCacheOptions
{
    public const string SectionName = "ToolResultCache";

    public int MaxEntries { get; set; } = 500;

    public int AbsoluteExpirationSeconds { get; set; } = 300;

    public string KeyPrefix { get; set; } = "toolnexus:tools";
}
