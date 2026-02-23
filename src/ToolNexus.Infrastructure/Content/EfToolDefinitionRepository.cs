using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Infrastructure.Content.Entities;
using ToolNexus.Infrastructure.Data;

namespace ToolNexus.Infrastructure.Content;

public sealed class EfToolDefinitionRepository(ToolNexusContentDbContext dbContext) : IToolDefinitionRepository
{
    public Task<IReadOnlyCollection<ToolDefinitionListItem>> GetListAsync(CancellationToken cancellationToken = default)
        => ExecuteWithSchemaRecoveryAsync(async () =>
            (IReadOnlyCollection<ToolDefinitionListItem>)await dbContext.ToolDefinitions
                .AsNoTracking()
                .OrderBy(x => x.SortOrder)
                .ThenBy(x => x.Name)
                .Select(x => new ToolDefinitionListItem(x.Id, x.Name, x.Slug, x.Category, x.Status, x.UpdatedAt))
                .ToListAsync(cancellationToken),
            cancellationToken);

    public Task<ToolDefinitionDetail?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
        => ExecuteWithSchemaRecoveryAsync(async () =>
            await dbContext.ToolDefinitions
                .AsNoTracking()
                .Where(x => x.Id == id)
                .Select(x => new ToolDefinitionDetail(x.Id, x.Name, x.Slug, x.Description, x.Category, x.Status, x.Icon, x.SortOrder, x.InputSchema, x.OutputSchema, x.UpdatedAt))
                .SingleOrDefaultAsync(cancellationToken),
            cancellationToken);

    public Task<bool> ExistsBySlugAsync(string slug, int? excludingId = null, CancellationToken cancellationToken = default)
        => ExecuteWithSchemaRecoveryAsync(async () =>
        {
            var query = dbContext.ToolDefinitions.AsNoTracking().Where(x => x.Slug == slug);
            if (excludingId.HasValue)
            {
                query = query.Where(x => x.Id != excludingId.Value);
            }

            return await query.AnyAsync(cancellationToken);
        }, cancellationToken);

    public async Task<ToolDefinitionDetail> CreateAsync(CreateToolDefinitionRequest request, CancellationToken cancellationToken = default)
        => await ExecuteWithSchemaRecoveryAsync(async () =>
        {
            var entity = new ToolDefinitionEntity
            {
                Name = request.Name,
                Slug = request.Slug,
                Description = request.Description,
                Category = request.Category,
                Status = request.Status,
                Icon = request.Icon,
                SortOrder = request.SortOrder,
                ActionsCsv = "execute",
                InputSchema = request.InputSchema,
                OutputSchema = request.OutputSchema,
                UpdatedAt = DateTimeOffset.UtcNow
            };

            dbContext.ToolDefinitions.Add(entity);
            await dbContext.SaveChangesAsync(cancellationToken);
            return MapDetail(entity);
        }, cancellationToken);

    public async Task<ToolDefinitionDetail?> UpdateAsync(int id, UpdateToolDefinitionRequest request, CancellationToken cancellationToken = default)
        => await ExecuteWithSchemaRecoveryAsync(async () =>
        {
            var entity = await dbContext.ToolDefinitions.SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
            if (entity is null)
            {
                return null;
            }

            entity.Name = request.Name;
            entity.Slug = request.Slug;
            entity.Description = request.Description;
            entity.Category = request.Category;
            entity.Status = request.Status;
            entity.Icon = request.Icon;
            entity.SortOrder = request.SortOrder;
            entity.InputSchema = request.InputSchema;
            entity.OutputSchema = request.OutputSchema;
            entity.UpdatedAt = DateTimeOffset.UtcNow;

            await dbContext.SaveChangesAsync(cancellationToken);
            return MapDetail(entity);
        }, cancellationToken);

    public Task<bool> SetEnabledAsync(int id, bool enabled, CancellationToken cancellationToken = default)
        => ExecuteWithSchemaRecoveryAsync(async () =>
        {
            var entity = await dbContext.ToolDefinitions.SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
            if (entity is null)
            {
                return false;
            }

            entity.Status = enabled ? "Enabled" : "Disabled";
            entity.UpdatedAt = DateTimeOffset.UtcNow;
            await dbContext.SaveChangesAsync(cancellationToken);
            return true;
        }, cancellationToken);

    private async Task<T> ExecuteWithSchemaRecoveryAsync<T>(Func<Task<T>> action, CancellationToken cancellationToken)
    {
        try
        {
            return await action();
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.UndefinedTable)
        {
            await dbContext.Database.MigrateAsync(cancellationToken);
            return await action();
        }
        catch (SqliteException ex) when (ex.SqliteErrorCode == 1 && ex.Message.Contains("no such table", StringComparison.OrdinalIgnoreCase))
        {
            await dbContext.Database.MigrateAsync(cancellationToken);
            return await action();
        }
    }

    private static ToolDefinitionDetail MapDetail(ToolDefinitionEntity entity)
        => new(entity.Id, entity.Name, entity.Slug, entity.Description, entity.Category, entity.Status, entity.Icon, entity.SortOrder, entity.InputSchema, entity.OutputSchema, entity.UpdatedAt);
}
