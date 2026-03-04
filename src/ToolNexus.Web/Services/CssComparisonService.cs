using System.Text.Json;
using ToolNexus.Web.Models;

namespace ToolNexus.Web.Services;

public sealed class CssComparisonService(CssReportStorageService cssReportStorageService)
{
    public async Task<CssComparisonResult> Compare(string domainA, string domainB, CancellationToken cancellationToken = default)
    {
        var reportA = await cssReportStorageService.LoadReport(domainA, cancellationToken);
        var reportB = await cssReportStorageService.LoadReport(domainB, cancellationToken);

        var efficiencyA = CalculateEfficiency(reportA.UsedCss, reportA.TotalCss);
        var efficiencyB = CalculateEfficiency(reportB.UsedCss, reportB.TotalCss);

        var winner = efficiencyA == efficiencyB
            ? "Tie"
            : efficiencyA > efficiencyB
                ? domainA
                : domainB;

        return new CssComparisonResult
        {
            DomainA = domainA,
            DomainB = domainB,
            EfficiencyA = efficiencyA,
            EfficiencyB = efficiencyB,
            FrameworkA = reportA.Framework,
            FrameworkB = reportB.Framework,
            Winner = winner
        };
    }

    private static int CalculateEfficiency(double usedCss, double totalCss)
    {
        if (totalCss <= 0)
        {
            return 0;
        }

        var efficiency = usedCss / totalCss;
        return (int)Math.Round(Math.Clamp(efficiency * 100d, 0d, 100d));
    }
}

public sealed class CssReportStorageService(CssScanCacheService cssScanCacheService)
{
    public async Task<CssReportRecord> LoadReport(string domain, CancellationToken cancellationToken = default)
    {
        var url = $"https://{domain}";
        var payload = await cssScanCacheService.GetCachedResult(url, cancellationToken);
        if (string.IsNullOrWhiteSpace(payload))
        {
            return CssReportRecord.Empty;
        }

        using var document = JsonDocument.Parse(payload);
        var root = document.RootElement;

        var totalCss = ReadNumber(root, "totalCss", "total_css", "totalCSS", "total");
        var usedCss = ReadNumber(root, "usedCss", "used_css", "usedCSS", "used");
        var framework = ReadString(root, "framework", "frameworkName", "detectedFramework") ?? "Unknown";

        return new CssReportRecord(totalCss, usedCss, framework);
    }

    private static double ReadNumber(JsonElement element, params string[] candidateKeys)
    {
        foreach (var key in candidateKeys)
        {
            if (!element.TryGetProperty(key, out var value))
            {
                continue;
            }

            if (value.ValueKind == JsonValueKind.Number && value.TryGetDouble(out var number))
            {
                return number;
            }

            if (value.ValueKind == JsonValueKind.String && double.TryParse(value.GetString(), out var parsedNumber))
            {
                return parsedNumber;
            }
        }

        return 0;
    }

    private static string? ReadString(JsonElement element, params string[] candidateKeys)
    {
        foreach (var key in candidateKeys)
        {
            if (!element.TryGetProperty(key, out var value))
            {
                continue;
            }

            if (value.ValueKind == JsonValueKind.String)
            {
                return value.GetString();
            }
        }

        return null;
    }
}

public sealed record CssReportRecord(double TotalCss, double UsedCss, string Framework)
{
    public static CssReportRecord Empty { get; } = new(0, 0, "Unknown");
}
