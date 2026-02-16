using System.Security;
using System.Text;

namespace ToolNexus.Web.Services;

public interface ISitemapService
{
    string BuildSitemap(string baseUrl);
}

public sealed class SitemapService(IManifestService manifestService) : ISitemapService
{
    public string BuildSitemap(string baseUrl)
    {
        var urls = new List<string>
        {
            $"{baseUrl}/",
            $"{baseUrl}/tools"
        };

        urls.AddRange(manifestService.GetAllCategories().Select(category => $"{baseUrl}/tools/{Uri.EscapeDataString(category)}"));
        urls.AddRange(manifestService.GetAllTools().Select(tool => $"{baseUrl}/tools/{Uri.EscapeDataString(tool.Slug)}"));

        var xml = new StringBuilder();
        xml.AppendLine("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
        xml.AppendLine("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">");

        foreach (var url in urls.Distinct(StringComparer.OrdinalIgnoreCase))
        {
            xml.AppendLine("  <url>");
            xml.AppendLine($"    <loc>{SecurityElement.Escape(url)}</loc>");
            xml.AppendLine("  </url>");
        }

        xml.AppendLine("</urlset>");
        return xml.ToString();
    }
}
