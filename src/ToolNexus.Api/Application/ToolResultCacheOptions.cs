namespace ToolNexus.Api.Application;

public sealed class ToolResultCacheOptions
{
    public const int DefaultMaxEntries = 500;

    public int MaxEntries { get; set; } = DefaultMaxEntries;
}
