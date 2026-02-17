namespace ToolNexus.Api.Options;

public sealed class SecurityHeadersOptions
{
    public const string SectionName = "Security:Headers";

    public bool EnableContentSecurityPolicy { get; set; } = true;

    public bool EnableCspReportOnlyInDevelopment { get; set; } = true;

    public string XFrameOptions { get; set; } = "DENY";

    public string XContentTypeOptions { get; set; } = "nosniff";

    public string ReferrerPolicy { get; set; } = "strict-origin-when-cross-origin";

    public string PermissionsPolicy { get; set; } = "camera=(), geolocation=(), microphone=()";

    public Dictionary<string, List<string>> ContentSecurityPolicy { get; set; } = new(StringComparer.OrdinalIgnoreCase)
    {
        ["default-src"] = ["'self'"],
        ["script-src"] = ["'self'", "cdnjs.cloudflare.com"],
        ["style-src"] = ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com"],
        ["img-src"] = ["'self'", "data:"],
        ["font-src"] = ["'self'", "cdnjs.cloudflare.com"],
        ["connect-src"] = ["'self'"]
    };
}
