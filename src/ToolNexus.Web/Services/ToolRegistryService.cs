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
                ModulePath = string.IsNullOrWhiteSpace(manifest.ModulePath) ? $"/js/tools/{manifest.Slug}.js" : manifest.ModulePath,
                TemplatePath = string.IsNullOrWhiteSpace(manifest.TemplatePath) ? $"/tool-templates/{manifest.Slug}.html" : manifest.TemplatePath,
                Dependencies = manifest.Dependencies ?? [],
                Styles = manifest.Styles?.Length > 0
                    ? manifest.Styles
                    : (string.IsNullOrWhiteSpace(manifest.CssPath) ? [] : [manifest.CssPath]),
                Category = manifest.Category,
                UiMode = manifest.UiMode,
                ComplexityTier = manifest.ComplexityTier
            })
            .ToArray();

        descriptorsBySlug = descriptors.ToDictionary(descriptor => descriptor.Slug, StringComparer.OrdinalIgnoreCase);
    }

    public ToolDescriptor? GetBySlug(string slug) =>
        descriptorsBySlug.TryGetValue(slug, out var descriptor) ? descriptor : null;

    public IReadOnlyCollection<ToolDescriptor> GetAll() => descriptors;
}
