using System.Text;
using System.Xml;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;
using ToolNexus.Web.Services;

namespace ToolNexus.Web.Controllers;

public sealed class SeoController(ISitemapService sitemapService) : Controller
{
    [HttpGet("/sitemap.xml")]
    [OutputCache(Duration = 600)]
    public async Task Sitemap(CancellationToken cancellationToken)
    {
        var baseUrl = $"{Request.Scheme}://{Request.Host}";
        Response.ContentType = "application/xml; charset=utf-8";

        await using var xmlStream = Response.BodyWriter.AsStream();
        await using var writer = XmlWriter.Create(xmlStream, new XmlWriterSettings
        {
            Async = true,
            Encoding = Encoding.UTF8,
            Indent = false
        });

        await writer.WriteStartDocumentAsync();
        await writer.WriteStartElementAsync(null, "urlset", "http://www.sitemaps.org/schemas/sitemap/0.9");

        await foreach (var entry in sitemapService.GetEntriesAsync(baseUrl, cancellationToken))
        {
            await writer.WriteStartElementAsync(null, "url", null);
            await writer.WriteElementStringAsync(null, "loc", null, entry.Loc);
            await writer.WriteElementStringAsync(null, "lastmod", null, entry.LastModified);
            await writer.WriteElementStringAsync(null, "changefreq", null, entry.ChangeFrequency);
            await writer.WriteElementStringAsync(null, "priority", null, entry.Priority.ToString("0.0", System.Globalization.CultureInfo.InvariantCulture));
            await writer.WriteEndElementAsync();
        }

        await writer.WriteEndElementAsync();
        await writer.WriteEndDocumentAsync();
        await writer.FlushAsync();
    }

    [HttpGet("/robots.txt")]
    [OutputCache(Duration = 600)]
    public ContentResult Robots()
    {
        var baseUrl = $"{Request.Scheme}://{Request.Host}";
        var content = string.Join('\n',
        [
            "User-agent: *",
            "Allow: /",
            "Allow: /tools/",
            "Disallow: /api/",
            "Disallow: /swagger/",
            "Disallow: /health",
            $"Sitemap: {baseUrl}/sitemap.xml"
        ]);

        return Content(content, "text/plain", Encoding.UTF8);
    }
}
