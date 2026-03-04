namespace ToolNexus.Web.Models;

public class SelectorCoverageResult
{
    public int TotalSelectors { get; set; }

    public int UsedSelectors { get; set; }

    public int UnusedSelectors { get; set; }

    public List<string> UnusedSelectorList { get; set; } = [];
}
