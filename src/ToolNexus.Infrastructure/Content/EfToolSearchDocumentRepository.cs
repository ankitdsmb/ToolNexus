using Microsoft.EntityFrameworkCore;
using ToolNexus.Application.Contracts;
using ToolNexus.Application.Services.Discovery;
using ToolNexus.Infrastructure.Data;

namespace ToolNexus.Infrastructure.Content;

public sealed class EfToolSearchDocumentRepository(ToolNexusContentDbContext dbContext) : IToolSearchDocumentRepository
{
    public Task<int> CountAsync(IReadOnlyCollection<string> tokens, CancellationToken cancellationToken = default)
        => BuildQuery(tokens).CountAsync(cancellationToken);

    public async Task<IReadOnlyCollection<ToolSearchDocument>> FetchPageAsync(
        IReadOnlyCollection<string> tokens,
        int skip,
        int take,
        CancellationToken cancellationToken = default)
    {
        var tools = await BuildQuery(tokens)
            .OrderBy(x => x.SortOrder)
            .ThenBy(x => x.Name)
            .Skip(skip)
            .Take(take)
            .Select(x => new ToolSearchDocument(
                x.Slug,
                x.Name,
                x.Category,
                x.Description,
                $"{x.Slug} {x.Category} {x.ActionsCsv}",
                new ToolCatalogItemDto(
                    x.Slug,
                    x.Name,
                    x.Category,
                    x.ActionsCsv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList(),
                    x.Name,
                    x.Description,
                    x.InputSchema,
                    x.ActionsCsv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList(),
                    "1.0.0",
                    true,
                    false,
                    true,
                    "Medium",
                    true,
                    false,
                    "dotnet",
                    "standard",
                    null)))
            .ToListAsync(cancellationToken);

        return tools;
    }

    private IQueryable<Entities.ToolDefinitionEntity> BuildQuery(IReadOnlyCollection<string> tokens)
    {
        var query = dbContext.ToolDefinitions
            .AsNoTracking()
            .Where(x => x.Status == "Enabled");

        foreach (var token in tokens)
        {
            var pattern = $"%{token}%";
            query = query.Where(x =>
                EF.Functions.Like(x.Name, pattern)
                || EF.Functions.Like(x.Slug, pattern)
                || EF.Functions.Like(x.Description, pattern)
                || EF.Functions.Like(x.Category, pattern)
                || EF.Functions.Like(x.ActionsCsv, pattern));
        }

        return query;
    }
}
