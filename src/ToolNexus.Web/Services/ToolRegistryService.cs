namespace ToolNexus.Web.Services;

public sealed class ToolRegistryService : IToolRegistryService
{
    private readonly IReadOnlyCollection<ToolDescriptor> descriptors;
    private readonly IReadOnlyDictionary<string, ToolDescriptor> descriptorsBySlug;

    public ToolRegistryService(IToolManifestLoader manifestLoader)
    {
        descriptors = manifestLoader.LoadAll()
            .Select(manifest => new ToolDescriptor
            {
                Slug = manifest.Slug,
                ViewName = manifest.ViewName,
                Category = manifest.Category
            })
            .ToArray();

        descriptorsBySlug = descriptors.ToDictionary(descriptor => descriptor.Slug, StringComparer.OrdinalIgnoreCase);
    }

    public ToolDescriptor? GetBySlug(string slug) =>
        descriptorsBySlug.TryGetValue(slug, out var descriptor) ? descriptor : null;

    public IReadOnlyCollection<ToolDescriptor> GetAll() => descriptors;
}
