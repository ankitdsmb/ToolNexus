namespace ToolNexus.Infrastructure.Options;

public sealed class AuditGuardrailsOptions
{
    public const string SectionName = "AuditGuardrails";

    public bool WriteEnabled { get; set; }
    public bool WorkerEnabled { get; set; }
    public string[] Destinations { get; set; } = ["siem_primary"];
}
