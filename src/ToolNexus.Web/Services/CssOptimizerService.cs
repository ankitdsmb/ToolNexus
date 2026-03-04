using System.Text;
using ToolNexus.Web.Models;

namespace ToolNexus.Web.Services;

public sealed class CssOptimizerService
{
    public OptimizedCssResult GenerateOptimizedCss(string css, HashSet<string> usedSelectors)
    {
        css ??= string.Empty;
        usedSelectors ??= [];

        var normalizedUsedSelectors = new HashSet<string>(
            usedSelectors.Where(selector => !string.IsNullOrWhiteSpace(selector)).Select(selector => selector.Trim()),
            StringComparer.Ordinal);

        var optimizedCss = OptimizeRules(css, normalizedUsedSelectors);
        var originalSize = Encoding.UTF8.GetByteCount(css);
        var optimizedSize = Encoding.UTF8.GetByteCount(optimizedCss);

        var savingsPercent = originalSize == 0
            ? 0
            : Math.Round((originalSize - optimizedSize) * 100d / originalSize, 2);

        return new OptimizedCssResult
        {
            OptimizedCss = optimizedCss,
            OriginalSize = originalSize,
            OptimizedSize = optimizedSize,
            SavingsPercent = savingsPercent
        };
    }

    private static string OptimizeRules(string css, HashSet<string> usedSelectors)
    {
        var rules = new List<string>();
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

            var body = css[(blockStart + 1)..blockEnd];

            if (header.StartsWith("@", StringComparison.Ordinal))
            {
                if (IsKeyframes(header) || IsFontFace(header))
                {
                    rules.Add($"{header} {{{body}}}");
                }
                else if (header.StartsWith("@media", StringComparison.OrdinalIgnoreCase))
                {
                    var optimizedNested = OptimizeRules(body, usedSelectors);
                    rules.Add($"{header} {{{optimizedNested}}}");
                }
                else
                {
                    rules.Add($"{header} {{{body}}}");
                }
            }
            else
            {
                var keptSelectors = SplitSelectors(header)
                    .Where(selector => IsSelectorUsed(selector, usedSelectors))
                    .ToArray();

                if (keptSelectors.Length > 0)
                {
                    rules.Add($"{string.Join(", ", keptSelectors)} {{{body}}}");
                }
            }

            index = blockEnd + 1;
        }

        return string.Join('\n', rules);
    }

    private static bool IsSelectorUsed(string selector, HashSet<string> usedSelectors)
    {
        var trimmed = selector.Trim();
        if (trimmed.Length == 0)
        {
            return false;
        }

        if (usedSelectors.Contains(trimmed) || usedSelectors.Contains(NormalizeSelector(trimmed)))
        {
            return true;
        }

        foreach (var part in SplitSelectorParts(trimmed))
        {
            if (usedSelectors.Contains(part) || usedSelectors.Contains(NormalizeSelector(part)))
            {
                return true;
            }
        }

        return false;
    }

    private static IEnumerable<string> SplitSelectorParts(string selector)
    {
        return selector
            .Split(new[] { ' ', '>', '+', '~', '\t', '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries)
            .Select(part => part.Trim());
    }

    private static string NormalizeSelector(string selector)
    {
        var end = selector.IndexOfAny([':', '[']);
        return end < 0 ? selector.Trim() : selector[..end].Trim();
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

        return selectors.Where(selector => selector.Length > 0);
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

            if (ch == '\'' )
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
                continue;
            }

            if (ch == '}')
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

    private static bool IsKeyframes(string ruleHeader)
    {
        return ruleHeader.StartsWith("@keyframes", StringComparison.OrdinalIgnoreCase)
               || ruleHeader.StartsWith("@-webkit-keyframes", StringComparison.OrdinalIgnoreCase)
               || ruleHeader.StartsWith("@-moz-keyframes", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsFontFace(string ruleHeader)
    {
        return ruleHeader.StartsWith("@font-face", StringComparison.OrdinalIgnoreCase);
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

                if (index + 1 < css.Length)
                {
                    index += 2;
                }

                continue;
            }

            break;
        }
    }
}
