namespace ToolNexus.Application.Options;

public sealed class ExecutionAdmissionOptions
{
    public const string SectionName = "ExecutionAdmission";

    public string[] SupportedRuntimeLanguages { get; set; } = ["dotnet", "python"];

    public string[] BlockedCapabilities { get; set; } = [];

    public decimal MinimumQualityScore { get; set; } = 60m;
}
