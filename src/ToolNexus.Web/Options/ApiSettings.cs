namespace ToolNexus.Web.Options;

public sealed class ApiSettings
{
    public const string SectionName = "ApiSettings";

    public string BaseUrl { get; set; } = string.Empty;
    public string ToolExecutionPathPrefix { get; set; } = "/api/v1/tools";
}
