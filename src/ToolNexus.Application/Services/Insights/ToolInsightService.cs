using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services.Insights;

public sealed class ToolInsightService : IToolInsightService
{
    private readonly Dictionary<string, IToolInsightProvider> _providers;

    public ToolInsightService(IEnumerable<IToolInsightProvider> providers)
    {
        _providers = new Dictionary<string, IToolInsightProvider>(StringComparer.Ordinal);

        foreach (var provider in providers)
        {
            if (provider is null)
            {
                continue;
            }

            var normalizedSlug = Normalize(provider.ToolSlug);
            if (normalizedSlug.Length == 0)
            {
                continue;
            }

            _providers[normalizedSlug] = provider;
        }
    }

    public ToolInsightResult? GetInsight(
        string slug,
        string action,
        string input,
        string? error,
        IDictionary<string, string>? options)
    {
        var normalizedSlug = Normalize(slug);
        if (normalizedSlug.Length == 0)
        {
            return null;
        }

        if (!_providers.TryGetValue(normalizedSlug, out var provider))
        {
            return null;
        }

        return provider.GenerateInsight(
            action ?? string.Empty,
            input ?? string.Empty,
            error,
            options);
    }

    private static string Normalize(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        return value.Trim().ToLowerInvariant();
    }
}
