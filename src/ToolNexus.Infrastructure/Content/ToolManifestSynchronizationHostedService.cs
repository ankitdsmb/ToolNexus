using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using ToolNexus.Infrastructure.Content.Entities;
using ToolNexus.Infrastructure.Data;

namespace ToolNexus.Infrastructure.Content;

public sealed class ToolManifestSynchronizationHostedService(
    IServiceProvider serviceProvider,
    JsonFileToolManifestRepository manifestRepository,
    ILogger<ToolManifestSynchronizationHostedService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Yield();

        IReadOnlyCollection<ToolNexus.Application.Models.ToolDescriptor> manifestTools;
        try
        {
            manifestTools = manifestRepository.LoadTools();
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "{Category} unable to load tool manifest at startup.", "ToolSync");
            return;
        }

        var loadedCount = manifestTools.Count;
        logger.LogInformation("{Category} loaded {LoadedTools} tools from manifest.", "ToolSync", loadedCount);

        if (loadedCount == 0)
        {
            logger.LogError("{Category} zero tools loaded from manifest. This is a high-severity startup condition.", "ToolSync");
            return;
        }

        try
        {
            using var scope = serviceProvider.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<ToolNexusContentDbContext>();
            var existingBySlug = await dbContext.ToolDefinitions
                .ToDictionaryAsync(x => x.Slug, StringComparer.OrdinalIgnoreCase, stoppingToken);

            var now = DateTimeOffset.UtcNow;
            var added = 0;
            var updated = 0;

            foreach (var tool in manifestTools)
            {
                if (!existingBySlug.TryGetValue(tool.Slug, out var existing))
                {
                    dbContext.ToolDefinitions.Add(new ToolDefinitionEntity
                    {
                        Name = tool.Title,
                        Slug = tool.Slug,
                        Description = tool.SeoDescription,
                        Category = tool.Category,
                        Status = "Enabled",
                        Icon = "ti ti-tool",
                        SortOrder = 0,
                        ActionsCsv = string.Join(',', tool.Actions),
                        InputSchema = tool.ExampleInput,
                        OutputSchema = "{}",
                        UpdatedAt = now
                    });
                    added++;
                    continue;
                }

                var manifestActions = string.Join(',', tool.Actions);
                var changed = false;

                changed |= UpdateIfChanged(existing, existing.Name, tool.Title, static v => v, (entity, value) => entity.Name = value);
                changed |= UpdateIfChanged(existing, existing.Description, tool.SeoDescription, static v => v, (entity, value) => entity.Description = value);
                changed |= UpdateIfChanged(existing, existing.Category, tool.Category, static v => v, (entity, value) => entity.Category = value);
                changed |= UpdateIfChanged(existing, existing.ActionsCsv, manifestActions, static v => v, (entity, value) => entity.ActionsCsv = value);
                changed |= UpdateIfChanged(existing, existing.InputSchema, tool.ExampleInput, static v => v, (entity, value) => entity.InputSchema = value);

                if (changed)
                {
                    existing.UpdatedAt = now;
                    updated++;
                }
            }

            if (added > 0 || updated > 0)
            {
                await dbContext.SaveChangesAsync(stoppingToken);
            }

            logger.LogInformation("{Category} synchronization summary: loaded {LoadedTools}, added {AddedTools}, updated {UpdatedTools}.", "ToolSync", loadedCount, added, updated);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "{Category} database unavailable during startup synchronization; continuing without DB sync.", "ToolSync");
        }
    }

    private static bool UpdateIfChanged<T>(ToolDefinitionEntity entity, T currentValue, T newValue, Func<T, T> normalize, Action<ToolDefinitionEntity, T> assign)
    {
        var current = normalize(currentValue);
        var next = normalize(newValue);
        if (EqualityComparer<T>.Default.Equals(current, next))
        {
            return false;
        }

        assign(entity, next);
        return true;
    }
}
