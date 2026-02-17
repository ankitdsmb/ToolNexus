namespace ToolNexus.Api.Configuration;

public sealed class ApiCorsOptions
{
    public const string SectionName = "Cors";
    public const string PolicyName = "ToolNexusWeb";

    public string[] AllowedOrigins { get; set; } = [];
}
