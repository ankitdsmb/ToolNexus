namespace ToolNexus.Api.Options;

public sealed class JwtSecurityOptions
{
    public const string SectionName = "Security:Jwt";

    public string Issuer { get; init; } = "ToolNexus";
    public string Audience { get; init; } = "ToolNexus.Api";
    public string SigningKey { get; init; } = "toolnexus-development-signing-key-change-in-production";
}
