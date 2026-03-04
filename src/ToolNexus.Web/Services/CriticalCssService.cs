using System.Diagnostics;
using System.Text;
using System.Text.Json;

namespace ToolNexus.Web.Services;

public sealed class CriticalCssService
{
    private const int MaxCssBytes = 50 * 1024;

    public async Task<string> Generate(string url)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out _))
        {
            throw new ArgumentException("A valid absolute URL is required.", nameof(url));
        }

        var scriptPath = Path.Combine(Path.GetTempPath(), $"critical-css-{Guid.NewGuid():N}.mjs");

        await File.WriteAllTextAsync(scriptPath, GetScriptContents(), Encoding.UTF8);

        try
        {
            var processStartInfo = new ProcessStartInfo
            {
                FileName = "node",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false
            };

            processStartInfo.ArgumentList.Add(scriptPath);
            processStartInfo.ArgumentList.Add(url);

            using var process = new Process { StartInfo = processStartInfo };
            process.Start();

            var outputTask = process.StandardOutput.ReadToEndAsync();
            var errorTask = process.StandardError.ReadToEndAsync();

            await process.WaitForExitAsync();

            var output = await outputTask;
            var error = await errorTask;

            if (process.ExitCode != 0)
            {
                throw new InvalidOperationException($"Critical CSS generation failed: {error}");
            }

            if (string.IsNullOrWhiteSpace(output))
            {
                return string.Empty;
            }

            using var document = JsonDocument.Parse(output);

            if (!document.RootElement.TryGetProperty("css", out var cssProperty))
            {
                return string.Empty;
            }

            var cssBase64 = cssProperty.GetString();
            if (string.IsNullOrWhiteSpace(cssBase64))
            {
                return string.Empty;
            }

            var css = Encoding.UTF8.GetString(Convert.FromBase64String(cssBase64));
            var normalized = NormalizeCss(css);

            return EnforceSizeLimit(normalized, MaxCssBytes);
        }
        finally
        {
            if (File.Exists(scriptPath))
            {
                File.Delete(scriptPath);
            }
        }
    }

    private static string GetScriptContents() =>
        """
        import { chromium } from 'playwright';

        const target = process.argv[2];

        const ensureRange = (text, start, end) => {
            const s = Math.max(0, Math.min(text.length, start));
            const e = Math.max(0, Math.min(text.length, end));
            if (e <= s) return '';
            return text.slice(s, e);
        };

        const run = async () => {
            const browser = await chromium.launch({ headless: true });

            try {
                const page = await browser.newPage();
                await page.goto(target, { waitUntil: 'domcontentloaded' });

                await page.coverage.startCSSCoverage({ resetOnNavigation: false });
                await page.waitForTimeout(2000);

                const entries = await page.coverage.stopCSSCoverage();

                const chunks = [];
                for (const entry of entries) {
                    if (!entry || !entry.text || !Array.isArray(entry.ranges)) {
                        continue;
                    }

                    for (const range of entry.ranges) {
                        chunks.push(ensureRange(entry.text, range.start, range.end));
                    }
                }

                const css = chunks.join('\n');
                const encoded = Buffer.from(css, 'utf8').toString('base64');
                process.stdout.write(JSON.stringify({ css: encoded }));
            } finally {
                await browser.close();
            }
        };

        run().catch((error) => {
            process.stderr.write((error && error.stack) ? error.stack : String(error));
            process.exit(1);
        });
        """;

    private static string NormalizeCss(string css)
    {
        if (string.IsNullOrWhiteSpace(css))
        {
            return string.Empty;
        }

        var sanitized = css.Replace("\0", string.Empty).Trim();

        var openBraces = sanitized.Count(ch => ch == '{');
        var closeBraces = sanitized.Count(ch => ch == '}');

        if (closeBraces > openBraces)
        {
            var extra = closeBraces - openBraces;
            while (extra > 0)
            {
                var idx = sanitized.LastIndexOf('}');
                if (idx < 0)
                {
                    break;
                }

                sanitized = sanitized.Remove(idx, 1);
                extra--;
            }
        }
        else if (openBraces > closeBraces)
        {
            sanitized += new string('}', openBraces - closeBraces);
        }

        return sanitized;
    }

    private static string EnforceSizeLimit(string css, int maxBytes)
    {
        if (Encoding.UTF8.GetByteCount(css) <= maxBytes)
        {
            return css;
        }

        var bytes = Encoding.UTF8.GetBytes(css);
        var limited = Encoding.UTF8.GetString(bytes, 0, maxBytes);

        var lastRuleEnd = limited.LastIndexOf('}');
        if (lastRuleEnd >= 0)
        {
            limited = limited[..(lastRuleEnd + 1)];
        }

        return NormalizeCss(limited);
    }
}
