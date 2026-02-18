namespace ToolNexus.Web.Options;

public sealed class InternalAuthOptions
{
    public const string SectionName = "InternalAuth";

    public string UserId { get; init; } = string.Empty;
    public string DisplayName { get; init; } = string.Empty;
    public string[] ToolPermissions { get; init; } = Array.Empty<string>();
    public string[] SecurityLevels { get; init; } = Array.Empty<string>();
}
