using Microsoft.EntityFrameworkCore;
using ToolNexus.Infrastructure.Data;

namespace ToolNexus.Web.Pages.Marketplace;

public sealed class MarketplaceService(ToolNexusContentDbContext dbContext)
{
    public async Task<IReadOnlyList<MarketplaceToolCard>> GetCatalogAsync(
        string? category,
        MarketplaceSort sort,
        CancellationToken cancellationToken)
    {
        var normalizedCategory = string.IsNullOrWhiteSpace(category)
            ? null
            : category.Trim();

        FormattableString sql = sort switch
        {
            MarketplaceSort.Popularity => $"""
                SELECT
                    td.\"Name\" AS \"ToolName\",
                    mt.\"authorId\" AS \"Author\",
                    mt.\"downloads\" AS \"Downloads\",
                    mt.\"rating\" AS \"Rating\",
                    td.\"Category\" AS \"Category\",
                    mt.\"createdAt\" AS \"CreatedAt\"
                FROM \"marketplace_tools\" mt
                INNER JOIN \"ToolDefinitions\" td ON td.\"Slug\" = mt.\"slug\"
                WHERE LOWER(td.\"Status\") = 'certified'
                    AND ({normalizedCategory} IS NULL OR LOWER(td.\"Category\") = LOWER({normalizedCategory}))
                ORDER BY mt.\"downloads\" DESC, mt.\"rating\" DESC, mt.\"createdAt\" DESC
                """,
            MarketplaceSort.Newest => $"""
                SELECT
                    td.\"Name\" AS \"ToolName\",
                    mt.\"authorId\" AS \"Author\",
                    mt.\"downloads\" AS \"Downloads\",
                    mt.\"rating\" AS \"Rating\",
                    td.\"Category\" AS \"Category\",
                    mt.\"createdAt\" AS \"CreatedAt\"
                FROM \"marketplace_tools\" mt
                INNER JOIN \"ToolDefinitions\" td ON td.\"Slug\" = mt.\"slug\"
                WHERE LOWER(td.\"Status\") = 'certified'
                    AND ({normalizedCategory} IS NULL OR LOWER(td.\"Category\") = LOWER({normalizedCategory}))
                ORDER BY mt.\"createdAt\" DESC, mt.\"downloads\" DESC
                """,
            _ => $"""
                SELECT
                    td.\"Name\" AS \"ToolName\",
                    mt.\"authorId\" AS \"Author\",
                    mt.\"downloads\" AS \"Downloads\",
                    mt.\"rating\" AS \"Rating\",
                    td.\"Category\" AS \"Category\",
                    mt.\"createdAt\" AS \"CreatedAt\"
                FROM \"marketplace_tools\" mt
                INNER JOIN \"ToolDefinitions\" td ON td.\"Slug\" = mt.\"slug\"
                WHERE LOWER(td.\"Status\") = 'certified'
                    AND ({normalizedCategory} IS NULL OR LOWER(td.\"Category\") = LOWER({normalizedCategory}))
                ORDER BY td.\"Category\" ASC, mt.\"downloads\" DESC, mt.\"createdAt\" DESC
                """
        };

        var tools = await dbContext.Database
            .SqlQuery<MarketplaceToolCard>(sql)
            .ToListAsync(cancellationToken);

        return tools;
    }
}

public enum MarketplaceSort
{
    Category,
    Popularity,
    Newest
}

public sealed class MarketplaceToolCard
{
    public required string ToolName { get; init; }
    public required string Author { get; init; }
    public long Downloads { get; init; }
    public decimal Rating { get; init; }
    public required string Category { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
}
