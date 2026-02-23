using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using ToolNexus.Application.Models;
using ToolNexus.Application.Options;

namespace ToolNexus.Application.Services;

public sealed class CachingToolCatalogService(
    ToolCatalogService inner,
    IMemoryCache cache,
    IOptions<PlatformCacheOptions> options) : IToolCatalogService
{
    private const string AllToolsKey = "platform:tool-catalog:all";
    private const string CategoriesKey = "platform:tool-catalog:categories";
    private const string CategoryPrefix = "platform:tool-catalog:category:";
    private readonly TimeSpan _ttl = TimeSpan.FromSeconds(options.Value.ToolMetadataTtlSeconds);

    public IReadOnlyCollection<ToolDescriptor> GetAllTools()
        => cache.GetOrCreate(AllToolsKey, entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = _ttl;
            return inner.GetAllTools();
        })!;

    public IReadOnlyCollection<string> GetAllCategories()
        => cache.GetOrCreate(CategoriesKey, entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = _ttl;
            return inner.GetAllCategories();
        })!;

    public ToolDescriptor? GetBySlug(string slug)
        => GetAllTools().FirstOrDefault(x => x.Slug.Equals(slug, StringComparison.OrdinalIgnoreCase));

    public IReadOnlyCollection<ToolDescriptor> GetByCategory(string category)
    {
        var key = $"{CategoryPrefix}{category.ToLowerInvariant()}";
        return cache.GetOrCreate(key, entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = _ttl;
            return inner.GetByCategory(category);
        })!;
    }

    public bool CategoryExists(string category)
        => GetAllCategories().Contains(category, StringComparer.OrdinalIgnoreCase);
}
