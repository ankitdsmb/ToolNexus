namespace ToolNexus.Web.Models;

public sealed class FrameworkDetectionResult
{
    public string Framework { get; init; } = "Unknown";

    public double? Confidence { get; init; }
}
