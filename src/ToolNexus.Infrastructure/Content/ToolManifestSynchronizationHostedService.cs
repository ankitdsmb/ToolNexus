using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Npgsql;
using ToolNexus.Application.Services;
using ToolNexus.Infrastructure.Content.Entities;
using ToolNexus.Infrastructure.Data;

namespace ToolNexus.Infrastructure.Content;

public sealed class ToolManifestSynchronizationHostedService(
    IServiceProvider serviceProvider,
    JsonFileToolManifestRepository manifestRepository,
    IDatabaseInitializationState initializationState,
    ILogger<ToolManifestSynchronizationHostedService> logger) : IStartupPhaseService
{
    public int Order => 2;

    public string PhaseName => "Tool Manifest Synchronization";

    public async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await initializationState.WaitForReadyAsync(stoppingToken);
        }
        catch (InvalidOperationException ex)
        {
            logger.LogWarning(ex, "Skipping manifest synchronization because database initialization did not reach ready state.");
            return;
        }

        logger.LogInformation("[ToolEndpointRegistration] Manifest synchronization started after database readiness signal.");

        try
        {
            var manifestTools = manifestRepository.LoadTools();

            var loadedCount = manifestTools.Count;
            logger.LogInformation("{Category} loaded {LoadedTools} tools from manifest.", "ToolSync", loadedCount);

            if (loadedCount == 0)
            {
                throw new InvalidOperationException("Tool manifest synchronization aborted because zero tools were loaded.");
            }

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
            logger.LogInformation("[ToolEndpointRegistration] Manifest synchronization completed successfully.");
        }
        catch (InvalidCastException ex)
        {
            logger.LogError(ex, "Manifest synchronization failed due to incompatible schema type mapping. Ensure migrations completed before synchronization.");
            throw;
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.DatatypeMismatch)
        {
            logger.LogError(ex, "Manifest synchronization failed due to PostgreSQL datatype mismatch. Ensure timestamp columns are migrated to timestamptz.");
            throw;
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
