using System.Text.RegularExpressions;
using ToolNexus.Application.Contracts;
using ToolNexus.Application.Services.Discovery;

namespace ToolNexus.Application.Services;

public sealed partial class TokenizedSearchIndex(IToolSearchDocumentRepository repository) : IToolSearchService
{
    private const int MaxPageSize = 100;

    public async Task<ToolSearchResultDto> SearchAsync(string? query, int page, int pageSize, CancellationToken cancellationToken = default)
    {
        var normalizedPage = page <= 0 ? 1 : page;
        var normalizedPageSize = Math.Clamp(pageSize <= 0 ? 20 : pageSize, 1, MaxPageSize);
        var normalizedQuery = query?.Trim() ?? string.Empty;
        var tokens = Tokenize(normalizedQuery);

        var totalCount = await repository.CountAsync(tokens, cancellationToken);
        if (totalCount == 0)
        {
            return new ToolSearchResultDto(normalizedQuery, [], 0, normalizedPage, normalizedPageSize);
        }

        var skip = (normalizedPage - 1) * normalizedPageSize;
        if (skip >= totalCount)
        {
            return new ToolSearchResultDto(normalizedQuery, [], totalCount, normalizedPage, normalizedPageSize);
        }

        var candidates = await repository.FetchPageAsync(tokens, skip, normalizedPageSize, cancellationToken);
        var rankedItems = candidates
            .Select(candidate => new { candidate.Item, Score = CalculateScore(candidate, tokens) })
            .OrderByDescending(x => x.Score)
            .ThenBy(x => x.Item.Title, StringComparer.OrdinalIgnoreCase)
            .Select(x => x.Item)
            .ToArray();

        return new ToolSearchResultDto(normalizedQuery, rankedItems, totalCount, normalizedPage, normalizedPageSize);
    }

    private static IReadOnlyCollection<string> Tokenize(string query)
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            return [];
        }

        return TokenRegex()
            .Matches(query.ToLowerInvariant())
            .Select(x => x.Value)
            .Distinct(StringComparer.Ordinal)
            .ToArray();
    }

    private static double CalculateScore(ToolSearchDocument document, IReadOnlyCollection<string> tokens)
    {
        if (tokens.Count == 0)
        {
            return 0;
        }

        var title = document.Title.ToLowerInvariant();
        var keywords = document.Keywords.ToLowerInvariant();
        var description = document.Description.ToLowerInvariant();

        var score = 0d;
        foreach (var token in tokens)
        {
            score += WeightedFieldScore(title, token, exactWeight: 12, prefixWeight: 9, containsWeight: 6);
            score += WeightedFieldScore(keywords, token, exactWeight: 8, prefixWeight: 6, containsWeight: 4);
            score += WeightedFieldScore(description, token, exactWeight: 4, prefixWeight: 3, containsWeight: 2);
        }

        return score;
    }

    private static double WeightedFieldScore(string field, string token, double exactWeight, double prefixWeight, double containsWeight)
    {
        if (field.Equals(token, StringComparison.Ordinal))
        {
            return exactWeight;
        }

        if (field.StartsWith(token, StringComparison.Ordinal))
        {
            return prefixWeight;
        }

        if (field.Contains(token, StringComparison.Ordinal))
        {
            return containsWeight;
        }

        return 0;
    }

    [GeneratedRegex("[a-z0-9]+", RegexOptions.Compiled)]
    private static partial Regex TokenRegex();
}
