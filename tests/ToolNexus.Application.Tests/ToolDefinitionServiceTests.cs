using System.ComponentModel.DataAnnotations;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using Xunit;

namespace ToolNexus.Application.Tests;

public sealed class ToolDefinitionServiceTests
{
    [Fact]
    public async Task CreateTool_PersistsTool()
    {
        var repository = new InMemoryToolDefinitionRepository();
        var service = new ToolDefinitionService(repository);

        var created = await service.CreateAsync(new CreateToolDefinitionRequest("JSON Formatter", "json-formatter", "Formats JSON", "Data", "Enabled", "icon", 1, "{}", "{}"));

        Assert.Equal("json-formatter", created.Slug);
        Assert.Single(await service.GetListAsync());
    }

    [Fact]
    public async Task UpdateTool_PersistsMetadata()
    {
        var repository = new InMemoryToolDefinitionRepository();
        var service = new ToolDefinitionService(repository);
        var created = await service.CreateAsync(new CreateToolDefinitionRequest("JSON Formatter", "json-formatter", "Formats JSON", "Data", "Enabled", "icon", 1, "{}", "{}"));

        var updated = await service.UpdateAsync(created.Id, new UpdateToolDefinitionRequest("JSON Minifier", "json-minifier", "Minifies JSON", "Data", "Enabled", "icon", 2, "{}", "{}"));

        Assert.NotNull(updated);
        Assert.Equal("json-minifier", updated!.Slug);
        Assert.Equal("JSON Minifier", updated.Name);
    }

    [Fact]
    public async Task DuplicateSlug_ThrowsValidationException()
    {
        var repository = new InMemoryToolDefinitionRepository();
        var service = new ToolDefinitionService(repository);
        await service.CreateAsync(new CreateToolDefinitionRequest("A", "same-slug", "desc", "Data", "Enabled", "icon", 1, "{}", "{}"));

        await Assert.ThrowsAsync<ValidationException>(() => service.CreateAsync(new CreateToolDefinitionRequest("B", "same-slug", "desc", "Data", "Enabled", "icon", 1, "{}", "{}")));
    }

    [Fact]
    public async Task EnableDisable_UpdatesVisibilityStatus()
    {
        var repository = new InMemoryToolDefinitionRepository();
        var service = new ToolDefinitionService(repository);
        var created = await service.CreateAsync(new CreateToolDefinitionRequest("A", "slug-a", "desc", "Data", "Enabled", "icon", 1, "{}", "{}"));

        await service.SetEnabledAsync(created.Id, false);
        var disabled = await service.GetByIdAsync(created.Id);
        Assert.Equal("Disabled", disabled!.Status);

        await service.SetEnabledAsync(created.Id, true);
        var enabled = await service.GetByIdAsync(created.Id);
        Assert.Equal("Enabled", enabled!.Status);
    }

    private sealed class InMemoryToolDefinitionRepository : IToolDefinitionRepository
    {
        private readonly List<ToolDefinitionDetail> _items = [];
        private int _id = 1;

        public Task<IReadOnlyCollection<ToolDefinitionListItem>> GetListAsync(CancellationToken cancellationToken = default)
            => Task.FromResult<IReadOnlyCollection<ToolDefinitionListItem>>(_items.Select(x => new ToolDefinitionListItem(x.Id, x.Name, x.Slug, x.Category, x.Status, x.UpdatedAt)).ToList());

        public Task<ToolDefinitionDetail?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
            => Task.FromResult(_items.SingleOrDefault(x => x.Id == id));

        public Task<bool> ExistsBySlugAsync(string slug, int? excludingId = null, CancellationToken cancellationToken = default)
            => Task.FromResult(_items.Any(x => x.Slug.Equals(slug, StringComparison.OrdinalIgnoreCase) && (!excludingId.HasValue || x.Id != excludingId.Value)));

        public Task<ToolDefinitionDetail> CreateAsync(CreateToolDefinitionRequest request, CancellationToken cancellationToken = default)
        {
            var detail = new ToolDefinitionDetail(_id++, request.Name, request.Slug, request.Description, request.Category, request.Status, request.Icon, request.SortOrder, request.InputSchema, request.OutputSchema, DateTimeOffset.UtcNow);
            _items.Add(detail);
            return Task.FromResult(detail);
        }

        public Task<ToolDefinitionDetail?> UpdateAsync(int id, UpdateToolDefinitionRequest request, CancellationToken cancellationToken = default)
        {
            var existing = _items.SingleOrDefault(x => x.Id == id);
            if (existing is null)
            {
                return Task.FromResult<ToolDefinitionDetail?>(null);
            }

            var updated = existing with { Name = request.Name, Slug = request.Slug, Description = request.Description, Category = request.Category, Status = request.Status, Icon = request.Icon, SortOrder = request.SortOrder, InputSchema = request.InputSchema, OutputSchema = request.OutputSchema, UpdatedAt = DateTimeOffset.UtcNow };
            _items[_items.FindIndex(x => x.Id == id)] = updated;
            return Task.FromResult<ToolDefinitionDetail?>(updated);
        }

        public Task<bool> SetEnabledAsync(int id, bool enabled, CancellationToken cancellationToken = default)
        {
            var existing = _items.SingleOrDefault(x => x.Id == id);
            if (existing is null)
            {
                return Task.FromResult(false);
            }

            var updated = existing with { Status = enabled ? "Enabled" : "Disabled", UpdatedAt = DateTimeOffset.UtcNow };
            _items[_items.FindIndex(x => x.Id == id)] = updated;
            return Task.FromResult(true);
        }
    }
}
