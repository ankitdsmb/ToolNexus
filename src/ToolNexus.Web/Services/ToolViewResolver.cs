namespace ToolNexus.Web.Services;

public sealed class ToolViewResolver(IToolRegistryService registry) : IToolViewResolver
{
    public string ResolveViewName(string slug)
    {
        var descriptor = registry.GetBySlug(slug);
        return descriptor?.ViewName ?? "Tool";
    }
}
