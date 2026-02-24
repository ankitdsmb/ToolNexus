namespace ToolNexus.Api.Logging;

public sealed class ToolNexusLoggingOptions
{
    public const string SectionName = "ToolNexusLogging";

    public string MinLevel { get; set; } = "Information";
    public bool RuntimeDebugEnabled { get; set; }
    public bool EnableClientIncidents { get; set; } = true;
}
