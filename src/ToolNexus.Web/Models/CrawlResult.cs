namespace ToolNexus.Web.Models;

public sealed class CrawlResult
{
    public int PagesScanned { get; init; }

    public List<string> Pages { get; init; } = [];
}
