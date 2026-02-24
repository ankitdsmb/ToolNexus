namespace ToolNexus.Api.Logging;

public sealed class ToolNexusLoggingOptions
{
    public const string SectionName = "LoggingOptions";

    public bool EnableFileLogging { get; set; } = true;
    public bool EnableRuntimeLogCapture { get; set; } = true;
    public string MinimumLevel { get; set; } = "Information";
    public int RetentionDays { get; set; } = 14;
    public bool RuntimeDebugEnabled { get; set; }
}
