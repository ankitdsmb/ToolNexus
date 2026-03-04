using System.Text;
using System.Text.RegularExpressions;
using Microsoft.Playwright;
using ToolNexus.Web.Models;

namespace ToolNexus.Web.Services;

public sealed class SelectorCoverageService
{
    private const float TimeoutMilliseconds = 15_000;
    private static readonly Regex ClassTokenRegex = new("\\.([a-zA-Z_][a-zA-Z0-9_-]*)", RegexOptions.Compiled);
    private static readonly Regex IdTokenRegex = new("#([a-zA-Z_][a-zA-Z0-9_-]*)", RegexOptions.Compiled);
    private static readonly Regex TagTokenRegex = new(@"^([a-zA-Z][a-zA-Z0-9_-]*)", RegexOptions.Compiled);
    private static readonly Regex AttributeRegex = new(@"\[[^\]]*\]", RegexOptions.Compiled);

    public List<string> ExtractSelectors(string css)
    {
        css ??= string.Empty;

        var selectors = new HashSet<string>(StringComparer.Ordinal);
        var index = 0;

        while (index < css.Length)
        {
            SkipTrivia(css, ref index);
            if (index >= css.Length)
            {
                break;
            }

            var blockStart = FindBlockStart(css, index);
            if (blockStart < 0)
            {
                break;
            }

            var header = css[index..blockStart].Trim();
            var blockEnd = FindMatchingBrace(css, blockStart);
            if (blockEnd < 0)
            {
                break;
            }

            if (header.Length > 0 && !header.StartsWith("@", StringComparison.Ordinal))
            {
                foreach (var selector in SplitSelectors(header))
                {
                    selectors.Add(selector);
                }
            }

            index = blockEnd + 1;
        }

        return selectors.ToList();
    }

    public async Task<SelectorCoverageResult> AnalyzeAsync(string url, string css, CancellationToken cancellationToken = default)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var parsedUrl)
            || (parsedUrl.Scheme != Uri.UriSchemeHttp && parsedUrl.Scheme != Uri.UriSchemeHttps))
        {
            throw new ArgumentException("A valid http/https URL is required.", nameof(url));
        }

        var selectors = ExtractSelectors(css);

        using var playwright = await Playwright.CreateAsync();
        await using var browser = await playwright.Chromium.LaunchAsync(new BrowserTypeLaunchOptions { Headless = true });
        await using var context = await browser.NewContextAsync();
        context.SetDefaultNavigationTimeout(TimeoutMilliseconds);
        context.SetDefaultTimeout(TimeoutMilliseconds);

        var page = await context.NewPageAsync();

        try
        {
            cancellationToken.ThrowIfCancellationRequested();

            await page.GotoAsync(url, new PageGotoOptions
            {
                Timeout = TimeoutMilliseconds,
                WaitUntil = WaitUntilState.NetworkIdle
            });

            var domSnapshot = await page.EvaluateAsync<DomSnapshot>(@"() => {
                const classes = new Set();
                const ids = new Set();
                const tags = new Set();

                for (const element of document.querySelectorAll('*')) {
                    tags.add(element.tagName.toLowerCase());

                    if (element.id) {
                        ids.add(element.id);
                    }

                    if (element.classList && element.classList.length > 0) {
                        for (const className of element.classList) {
                            classes.add(className);
                        }
                    }
                }

                return {
                    classes: Array.from(classes),
                    ids: Array.from(ids),
                    tags: Array.from(tags)
                };
            }");

            var classSet = new HashSet<string>(domSnapshot?.Classes ?? [], StringComparer.Ordinal);
            var idSet = new HashSet<string>(domSnapshot?.Ids ?? [], StringComparer.Ordinal);
            var tagSet = new HashSet<string>(domSnapshot?.Tags ?? [], StringComparer.OrdinalIgnoreCase);

            var unused = new List<string>();
            var usedCount = 0;

            foreach (var selector in selectors)
            {
                if (IsSelectorUsed(selector, classSet, idSet, tagSet))
                {
                    usedCount++;
                }
                else
                {
                    unused.Add(selector);
                }
            }

            return new SelectorCoverageResult
            {
                TotalSelectors = selectors.Count,
                UsedSelectors = usedCount,
                UnusedSelectors = unused.Count,
                UnusedSelectorList = unused
            };
        }
        finally
        {
            await page.CloseAsync();
        }
    }

    private static bool IsSelectorUsed(string selector, HashSet<string> classes, HashSet<string> ids, HashSet<string> tags)
    {
        if (string.IsNullOrWhiteSpace(selector))
        {
            return false;
        }

        var normalized = NormalizeSelector(selector);
        if (normalized.Length == 0)
        {
            return false;
        }

        if (normalized == "*" || normalized == ":root" || normalized == "html" || normalized == "body")
        {
            return true;
        }

        var parts = SplitCompoundParts(normalized);

        foreach (var part in parts)
        {
            var trimmedPart = part.Trim();
            if (trimmedPart.Length == 0 || trimmedPart == "*")
            {
                continue;
            }

            if (!DoesPartExist(trimmedPart, classes, ids, tags))
            {
                return false;
            }
        }

        return parts.Count != 0;
    }

    private static bool DoesPartExist(string part, HashSet<string> classes, HashSet<string> ids, HashSet<string> tags)
    {
        var attributeRemoved = AttributeRegex.Replace(part, string.Empty);

        foreach (Match classMatch in ClassTokenRegex.Matches(attributeRemoved))
        {
            if (!classes.Contains(classMatch.Groups[1].Value))
            {
                return false;
            }
        }

        foreach (Match idMatch in IdTokenRegex.Matches(attributeRemoved))
        {
            if (!ids.Contains(idMatch.Groups[1].Value))
            {
                return false;
            }
        }

        var tagMatch = TagTokenRegex.Match(attributeRemoved);
        if (tagMatch.Success && !tags.Contains(tagMatch.Groups[1].Value))
        {
            return false;
        }

        var hasToken = ClassTokenRegex.IsMatch(attributeRemoved)
            || IdTokenRegex.IsMatch(attributeRemoved)
            || TagTokenRegex.IsMatch(attributeRemoved);

        return hasToken;
    }

    private static List<string> SplitCompoundParts(string selector)
    {
        return selector
            .Split(new[] { ' ', '>', '+', '~', '\t', '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries)
            .ToList();
    }

    private static string NormalizeSelector(string selector)
    {
        if (selector.IndexOf(':') < 0)
        {
            return selector.Trim();
        }

        var builder = new StringBuilder(selector.Length);
        var inAttribute = false;
        var inParens = 0;

        foreach (var ch in selector)
        {
            if (ch == '[')
            {
                inAttribute = true;
                builder.Append(ch);
                continue;
            }

            if (ch == ']')
            {
                inAttribute = false;
                builder.Append(ch);
                continue;
            }

            if (ch == '(')
            {
                inParens++;
                builder.Append(ch);
                continue;
            }

            if (ch == ')' && inParens > 0)
            {
                inParens--;
                builder.Append(ch);
                continue;
            }

            if (!inAttribute && inParens == 0 && ch == ':')
            {
                break;
            }

            builder.Append(ch);
        }

        return builder.ToString().Trim();
    }

    private static IEnumerable<string> SplitSelectors(string selectorGroup)
    {
        var selectors = new List<string>();
        var builder = new StringBuilder();
        var nestingLevel = 0;

        foreach (var ch in selectorGroup)
        {
            switch (ch)
            {
                case '(':
                case '[':
                    nestingLevel++;
                    builder.Append(ch);
                    break;
                case ')':
                case ']':
                    nestingLevel = Math.Max(0, nestingLevel - 1);
                    builder.Append(ch);
                    break;
                case ',' when nestingLevel == 0:
                    if (builder.Length > 0)
                    {
                        selectors.Add(builder.ToString().Trim());
                        builder.Clear();
                    }
                    break;
                default:
                    builder.Append(ch);
                    break;
            }
        }

        if (builder.Length > 0)
        {
            selectors.Add(builder.ToString().Trim());
        }

        return selectors.Where(static selector => selector.Length > 0);
    }

    private static int FindBlockStart(string css, int start)
    {
        var inSingleQuote = false;
        var inDoubleQuote = false;

        for (var i = start; i < css.Length; i++)
        {
            var ch = css[i];

            if (inSingleQuote)
            {
                if (ch == '\'' && css[i - 1] != '\\')
                {
                    inSingleQuote = false;
                }

                continue;
            }

            if (inDoubleQuote)
            {
                if (ch == '"' && css[i - 1] != '\\')
                {
                    inDoubleQuote = false;
                }

                continue;
            }

            if (ch == '\'')
            {
                inSingleQuote = true;
                continue;
            }

            if (ch == '"')
            {
                inDoubleQuote = true;
                continue;
            }

            if (ch == '{')
            {
                return i;
            }

            if (ch == ';')
            {
                return -1;
            }
        }

        return -1;
    }

    private static int FindMatchingBrace(string css, int blockStart)
    {
        var depth = 0;
        var inSingleQuote = false;
        var inDoubleQuote = false;
        var inComment = false;

        for (var i = blockStart; i < css.Length; i++)
        {
            var ch = css[i];

            if (inComment)
            {
                if (ch == '*' && i + 1 < css.Length && css[i + 1] == '/')
                {
                    inComment = false;
                    i++;
                }

                continue;
            }

            if (!inSingleQuote && !inDoubleQuote && ch == '/' && i + 1 < css.Length && css[i + 1] == '*')
            {
                inComment = true;
                i++;
                continue;
            }

            if (inSingleQuote)
            {
                if (ch == '\'' && css[i - 1] != '\\')
                {
                    inSingleQuote = false;
                }

                continue;
            }

            if (inDoubleQuote)
            {
                if (ch == '"' && css[i - 1] != '\\')
                {
                    inDoubleQuote = false;
                }

                continue;
            }

            if (ch == '\'')
            {
                inSingleQuote = true;
                continue;
            }

            if (ch == '"')
            {
                inDoubleQuote = true;
                continue;
            }

            if (ch == '{')
            {
                depth++;
            }
            else if (ch == '}')
            {
                depth--;
                if (depth == 0)
                {
                    return i;
                }
            }
        }

        return -1;
    }

    private static void SkipTrivia(string css, ref int index)
    {
        while (index < css.Length)
        {
            if (char.IsWhiteSpace(css[index]))
            {
                index++;
                continue;
            }

            if (css[index] == '/' && index + 1 < css.Length && css[index + 1] == '*')
            {
                index += 2;
                while (index + 1 < css.Length && !(css[index] == '*' && css[index + 1] == '/'))
                {
                    index++;
                }

                index = Math.Min(css.Length, index + 2);
                continue;
            }

            break;
        }
    }

    private sealed class DomSnapshot
    {
        public string[] Classes { get; init; } = [];

        public string[] Ids { get; init; } = [];

        public string[] Tags { get; init; } = [];
    }
}
