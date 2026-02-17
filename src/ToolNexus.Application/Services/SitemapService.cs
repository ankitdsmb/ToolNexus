using System.Security;
using System.Text;

namespace ToolNexus.Application.Services;

public sealed class SitemapService(IToolCatalogService toolCatalogService, IToolContentService toolContentService) : ISitemapService
{
    public async Task<string> BuildSitemapAsync(string baseUrl, CancellationToken cancellationToken = default)
    {
        var urls = new List<string>
        {
            $"{baseUrl}/",
            $"{baseUrl}/tools",
            $"{baseUrl}/about",
            $"{baseUrl}/disclaimer",
            $"{baseUrl}/contact-us"
        };

        urls.AddRange(toolCatalogService.GetAllCategories().Select(category => $"{baseUrl}/tools/{Uri.EscapeDataString(category)}"));

        var slugs = await toolContentService.GetAllSlugsAsync(cancellationToken);
        urls.AddRange(slugs.Select(slug => $"{baseUrl}/tools/{Uri.EscapeDataString(slug)}"));

        var now = DateTime.UtcNow.ToString("yyyy-MM-dd");

        var xml = new StringBuilder();
        xml.AppendLine("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
        xml.AppendLine("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">");

        foreach (var url in urls.Distinct(StringComparer.OrdinalIgnoreCase))
        {
            xml.AppendLine("  <url>");
            xml.AppendLine($"    <loc>{SecurityElement.Escape(url)}</loc>");
            xml.AppendLine($"    <lastmod>{now}</lastmod>");
            xml.AppendLine("    <changefreq>weekly</changefreq>");
            xml.AppendLine("  </url>");
        }

        xml.AppendLine("</urlset>");
        return xml.ToString();
    }
}
