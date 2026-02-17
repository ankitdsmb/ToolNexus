using System.Runtime.CompilerServices;
using ToolNexus.Application.Models;

namespace ToolNexus.Web.Services;

public interface ISitemapService
{
    IAsyncEnumerable<SitemapUrlEntry> GetEntriesAsync(string baseUrl, CancellationToken cancellationToken = default);
}

public sealed record SitemapUrlEntry(string Loc, string LastModified, string ChangeFrequency, decimal Priority);

public sealed class SitemapService(IManifestService manifestService) : ISitemapService
{
    public async IAsyncEnumerable<SitemapUrlEntry> GetEntriesAsync(string baseUrl, [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow.ToString("yyyy-MM-dd");
        var safeBaseUrl = baseUrl.TrimEnd('/');

        var staticEntries = new[]
        {
            new SitemapUrlEntry($"{safeBaseUrl}/", now, "daily", 1.0m),
            new SitemapUrlEntry($"{safeBaseUrl}/tools", now, "daily", 0.9m),
            new SitemapUrlEntry($"{safeBaseUrl}/about", now, "monthly", 0.4m),
            new SitemapUrlEntry($"{safeBaseUrl}/contact-us", now, "monthly", 0.4m),
            new SitemapUrlEntry($"{safeBaseUrl}/disclaimer", now, "yearly", 0.3m)
        };

        foreach (var entry in staticEntries)
        {
            cancellationToken.ThrowIfCancellationRequested();
            yield return entry;
        }

        foreach (var category in manifestService.GetAllCategories())
        {
            cancellationToken.ThrowIfCancellationRequested();
            yield return new SitemapUrlEntry($"{safeBaseUrl}/tools/{Uri.EscapeDataString(category)}", now, "weekly", 0.7m);
            await Task.Yield();
        }

        foreach (var tool in manifestService.GetAllTools())
        {
            cancellationToken.ThrowIfCancellationRequested();
            yield return new SitemapUrlEntry($"{safeBaseUrl}/tools/{Uri.EscapeDataString(tool.Slug)}", now, "weekly", 0.8m);
            await Task.Yield();
        }
    }
}
