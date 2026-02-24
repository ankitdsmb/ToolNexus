namespace ToolNexus.Infrastructure.Options;

public sealed class StartupDiagnosticsOptions
{
    public const string SectionName = "StartupDiagnostics";

    public bool Enabled { get; set; } = true;

    public string LogFolder { get; set; } = "./logs/startup";
}
