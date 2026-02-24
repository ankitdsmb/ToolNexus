namespace ToolNexus.Infrastructure.Options;

public sealed class AdminBootstrapOptions
{
    public const string SectionName = "AdminBootstrap";

    public string UserName { get; init; } = string.Empty;

    public string Email { get; init; } = string.Empty;

    public string Password { get; init; } = string.Empty;

    public string DisplayName { get; init; } = "ToolNexus Administrator";
}
