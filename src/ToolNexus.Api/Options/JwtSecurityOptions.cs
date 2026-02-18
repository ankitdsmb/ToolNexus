namespace ToolNexus.Api.Options;

public sealed class JwtSecurityOptions
{
    public const string SectionName = "Security:Jwt";

    public string Issuer { get; set; } = "ToolNexus";
    public string Audience { get; set; } = "ToolNexus.Api";
    public string SigningKey { get; set; } = string.Empty;
}
