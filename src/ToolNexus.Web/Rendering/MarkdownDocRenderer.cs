using System.Net;
using System.Text;
using AngleSharp.Dom;
using AngleSharp.Html.Parser;
using Markdig;
using Microsoft.AspNetCore.Html;

namespace ToolNexus.Web.Rendering;

public static class MarkdownDocRenderer
{
    private static readonly MarkdownPipeline Pipeline = new MarkdownPipelineBuilder()
        .UseAdvancedExtensions()
        .DisableHtml()
        .Build();

    private static readonly HtmlParser Parser = new();

    private static readonly HashSet<string> AllowedTags =
    [
        "h2", "h3", "p", "ul", "ol", "li", "strong", "em", "code", "pre", "blockquote", "a"
    ];

    public static IHtmlContent Render(string markdown)
    {
        if (string.IsNullOrWhiteSpace(markdown))
        {
            return HtmlString.Empty;
        }

        var html = Markdown.ToHtml(markdown, Pipeline);
        var sanitized = SanitizeHtml(html);
        return new HtmlString(sanitized);
    }

    public static string BuildQuickStartMarkdown(IEnumerable<(string Title, string Description)> steps)
    {
        var builder = new StringBuilder();
        builder.AppendLine("## Quick start");
        builder.AppendLine();
        builder.AppendLine("Move through the flow once, confirm the output, then scale up.");
        builder.AppendLine();

        var index = 1;
        foreach (var (title, description) in steps)
        {
            builder.AppendLine($"{index}. **{EscapeMarkdown(title)}**");
            builder.AppendLine($"   {EscapeMarkdown(description)}");
            index++;
        }

        builder.AppendLine();
        builder.AppendLine("> Tip: Start with a minimal sample to validate behavior before running larger payloads.");

        return builder.ToString();
    }

    private static string SanitizeHtml(string html)
    {
        var context = Parser.ParseDocument("<div></div>").DocumentElement!;
        var fragment = Parser.ParseFragment(html, context);
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

        return !uri.IsAbsoluteUri || uri.Scheme is "http" or "https";
    }

    private static string EscapeMarkdown(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        return value
            .Replace("\\", "\\\\", StringComparison.Ordinal)
            .Replace("*", "\\*", StringComparison.Ordinal)
            .Replace("_", "\\_", StringComparison.Ordinal)
            .Replace("#", "\\#", StringComparison.Ordinal)
            .Replace("`", "\\`", StringComparison.Ordinal)
            .Trim();
    }
}
