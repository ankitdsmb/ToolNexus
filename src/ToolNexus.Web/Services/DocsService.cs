using System.Net;
using System.Text;
using AngleSharp.Dom;
using AngleSharp.Html.Parser;
using Markdig;
using Microsoft.AspNetCore.Html;

namespace ToolNexus.Web.Services;

public sealed class DocsService(IWebHostEnvironment webHostEnvironment)
{
    private static readonly MarkdownPipeline MarkdownPipeline = new MarkdownPipelineBuilder()
        .UseAdvancedExtensions()
        .DisableHtml()
        .Build();

    private static readonly HtmlParser HtmlParser = new();

    private static readonly HashSet<string> AllowedTags =
    [
        "h1", "h2", "h3", "h4", "h5", "h6",
        "p", "ul", "ol", "li", "strong", "em", "code", "pre", "blockquote",
        "a", "table", "thead", "tbody", "tr", "th", "td"
    ];

    public async Task<string> LoadMarkdownContentAsync(string relativePath, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(relativePath))
        {
            throw new ArgumentException("Relative path is required.", nameof(relativePath));
        }

        var docsRoot = Path.Combine(webHostEnvironment.ContentRootPath, "Docs");
        var fullPath = Path.GetFullPath(Path.Combine(docsRoot, relativePath));

        if (!fullPath.StartsWith(docsRoot, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Path must stay inside the Docs folder.");
        }

        if (!File.Exists(fullPath))
        {
            throw new FileNotFoundException("Markdown file was not found.", fullPath);
        }

        return await File.ReadAllTextAsync(fullPath, cancellationToken);
    }

    public IHtmlContent ConvertMarkdownToSafeHtml(string markdown)
    {
        if (string.IsNullOrWhiteSpace(markdown))
        {
            return HtmlString.Empty;
        }

        var html = Markdown.ToHtml(markdown, MarkdownPipeline);
        var safeHtml = SanitizeHtml(html);
        return new HtmlString(safeHtml);
    }

    public async Task<IHtmlContent> RenderDocumentAsync(string relativePath, CancellationToken cancellationToken = default)
    {
        var markdown = await LoadMarkdownContentAsync(relativePath, cancellationToken);
        return ConvertMarkdownToSafeHtml(markdown);
    }

    private static string SanitizeHtml(string html)
    {
        var context = HtmlParser.ParseDocument("<div></div>").DocumentElement!;
        var fragment = HtmlParser.ParseFragment(html, context);
        var builder = new StringBuilder();

        foreach (var node in fragment)
        {
            AppendSanitizedNode(builder, node);
        }

        return builder.ToString();
    }

    private static void AppendSanitizedNode(StringBuilder builder, INode node)
    {
        if (node is IText text)
        {
            builder.Append(WebUtility.HtmlEncode(text.Data));
            return;
        }

        if (node is not IElement element)
        {
            foreach (var child in node.ChildNodes)
            {
                AppendSanitizedNode(builder, child);
            }

            return;
        }

        var tag = element.TagName.ToLowerInvariant();
        if (!AllowedTags.Contains(tag))
        {
            foreach (var child in element.ChildNodes)
            {
                AppendSanitizedNode(builder, child);
            }

            return;
        }

        builder.Append('<').Append(tag);

        if (tag == "a")
        {
            var href = element.GetAttribute("href");
            var title = element.GetAttribute("title");

            if (IsAllowedHref(href))
            {
                builder.Append(" href=\"").Append(WebUtility.HtmlEncode(href)).Append('"');
                builder.Append(" rel=\"noopener noreferrer\"");
            }

            if (!string.IsNullOrWhiteSpace(title))
            {
                builder.Append(" title=\"").Append(WebUtility.HtmlEncode(title)).Append('"');
            }
        }

        builder.Append('>');

        foreach (var child in element.ChildNodes)
        {
            AppendSanitizedNode(builder, child);
        }

        builder.Append("</").Append(tag).Append('>');
    }

    private static bool IsAllowedHref(string? href)
    {
        if (string.IsNullOrWhiteSpace(href))
        {
            return false;
        }

        if (!Uri.TryCreate(href, UriKind.RelativeOrAbsolute, out var uri))
        {
            return false;
        }

        if (!uri.IsAbsoluteUri)
        {
            return true;
        }

        return uri.Scheme is "http" or "https";
    }
}
