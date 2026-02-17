using System.Text.Json;
using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public sealed class SeoMetadataService : ISeoMetadataService
{
    public SeoPageMetadata BuildToolPageMetadata(ToolDefinition tool, string baseUrl)
    {
        var safeBaseUrl = string.IsNullOrWhiteSpace(baseUrl) ? string.Empty : baseUrl.TrimEnd('/');
        var canonicalUrl = string.IsNullOrWhiteSpace(tool.Slug)
            ? safeBaseUrl
            : $"{safeBaseUrl}/tools/{Uri.EscapeDataString(tool.Slug)}";

        var title = string.IsNullOrWhiteSpace(tool.SeoTitle)
            ? $"{tool.Title} Tool | ToolNexus"
            : tool.SeoTitle;

        var description = string.IsNullOrWhiteSpace(tool.SeoDescription)
            ? $"Use {tool.Title} on ToolNexus for fast browser-based processing."
            : tool.SeoDescription;

        var jsonLd = string.IsNullOrWhiteSpace(tool.Title) || string.IsNullOrWhiteSpace(description)
            ? null
            : JsonSerializer.Serialize(new
            {
                @context = "https://schema.org",
                @type = "SoftwareApplication",
                name = tool.Title,
                description,
                applicationCategory = string.IsNullOrWhiteSpace(tool.Category) ? "DeveloperApplication" : $"{tool.Category} Developer Tool",
                operatingSystem = "Any",
                url = canonicalUrl,
                offers = new
                {
                    @type = "Offer",
                    price = "0",
                    priceCurrency = "USD"
                }
            });

        return new SeoPageMetadata
        {
            Title = title,
            Description = description,
            CanonicalUrl = canonicalUrl,
            OpenGraphType = "website",
            TwitterCard = "summary",
            JsonLd = jsonLd
        };
    }
}
