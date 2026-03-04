namespace ToolNexus.Web.Models;

public class CssComparisonResult
{
    public string DomainA { get; set; } = string.Empty;

    public string DomainB { get; set; } = string.Empty;

    public int EfficiencyA { get; set; }

    public int EfficiencyB { get; set; }

    public string FrameworkA { get; set; } = "Unknown";

    public string FrameworkB { get; set; } = "Unknown";

    public string Winner { get; set; } = string.Empty;
}
