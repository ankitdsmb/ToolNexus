using System.Net;
using System.Xml.Linq;
using Microsoft.AspNetCore.Mvc.Testing;

namespace ToolNexus.Web.IntegrationTests;

public sealed class SitemapIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public SitemapIntegrationTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.WithWebHostBuilder(_ => { }).CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = true
        });
    }

    [Fact, Trait("Category", "SEO"), Trait("Category", "Integration")]
    public async Task Sitemap_ReturnsXml_WithExpectedUrls_AndDeterministicOrdering()
    {
        var response = await _client.GetAsync("/sitemap.xml");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("application/xml", response.Content.Headers.ContentType?.MediaType);

        var content = await response.Content.ReadAsStringAsync();
        var xml = XDocument.Parse(content);
        XNamespace ns = "http://www.sitemaps.org/schemas/sitemap/0.9";

        var locs = xml.Descendants(ns + "loc").Select(x => x.Value).ToList();
        Assert.NotEmpty(locs);
        Assert.Equal("http://localhost/", locs[0]);
        Assert.Contains("http://localhost/tools", locs);
        Assert.Contains(locs, x => x.Contains("/tools/json-formatter", StringComparison.Ordinal));

        var lastmod = xml.Descendants(ns + "lastmod").First().Value;
        Assert.Matches("^\\d{4}-\\d{2}-\\d{2}$", lastmod);
    }
}
