namespace ToolNexus.Web.Options;

public sealed class InternalAuthOptions
{
    public const string SectionName = "InternalAuth";

    public string UserId { get; init; } = "internal-dev-user";
    public string DisplayName { get; init; } = "Internal Dev User";
    public string[] ToolPermissions { get; init; } = ["*:*"];
    public string[] SecurityLevels { get; init; } = ["High"];
}
