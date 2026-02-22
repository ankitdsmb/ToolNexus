using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Infrastructure.Data;

namespace ToolNexus.Infrastructure.Content;

public sealed class DbToolManifestRepository(
    IServiceScopeFactory scopeFactory,
    JsonFileToolManifestRepository fallbackRepository,
    ILogger<DbToolManifestRepository> logger) : IToolManifestRepository
{
    public IReadOnlyCollection<ToolDescriptor> LoadTools()
    {
        try
        {
            using var scope = scopeFactory.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<ToolNexusContentDbContext>();
            var tools = dbContext.ToolDefinitions
                .AsNoTracking()
                .Where(x => x.Status == "Enabled")
                .OrderBy(x => x.SortOrder)
                .ThenBy(x => x.Name)
                .Select(x => new ToolDescriptor
                {
                    Slug = x.Slug,
                    Title = x.Name,
                    Category = x.Category,
                    Actions = x.ActionsCsv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList(),
                    SeoTitle = x.Name,
                    SeoDescription = x.Description,
                    ExampleInput = x.InputSchema,
                    ClientSafeActions = x.ActionsCsv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList()
                })
                .ToList();

            return tools.Count > 0 ? tools : fallbackRepository.LoadTools();
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Falling back to file manifest repository due to database unavailability.");
            return fallbackRepository.LoadTools();
        }
    }
}
