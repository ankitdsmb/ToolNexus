using ToolNexus.Application.Models;
using ToolNexus.Domain;

namespace ToolNexus.Application.Services;

public sealed class ToolManifestCatalog : IToolManifestCatalog
{
    private readonly IReadOnlyDictionary<string, ToolManifestV1> _manifestBySlug;

    public ToolManifestCatalog(IEnumerable<IToolExecutor> executors)
    {
        var manifests = new Dictionary<string, ToolManifestV1>(StringComparer.OrdinalIgnoreCase);

        foreach (var executor in executors)
        {
            var slug = executor.Slug?.Trim().ToLowerInvariant();
            if (string.IsNullOrWhiteSpace(slug))
            {
                throw new InvalidOperationException($"Tool executor {executor.GetType().Name} has empty slug.");
            }

            if (!manifests.TryAdd(slug, BuildManifest(executor, slug)))
            {
                throw new InvalidOperationException($"Duplicate tool slug '{slug}' detected.");
            }
        }

        _manifestBySlug = manifests;
    }

    public IReadOnlyCollection<ToolManifestV1> GetAll() => _manifestBySlug.Values.ToArray();

    public ToolManifestV1? GetBySlug(string slug)
    {
        if (string.IsNullOrWhiteSpace(slug))
        {
            return null;
        }

        return _manifestBySlug.TryGetValue(slug.Trim(), out var manifest) ? manifest : null;
    }

    private static ToolManifestV1 BuildManifest(IToolExecutor executor, string slug)
    {
        var actions = executor.SupportedActions?
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select((name, index) => new ToolActionDefinition(name.Trim().ToLowerInvariant(), $"Executes '{name.Trim().ToLowerInvariant()}'", index == 0))
            .ToArray() ?? [];

        if (actions.Length == 0)
        {
            throw new InvalidOperationException($"Tool '{slug}' must define at least one action.");
        }

        var capabilities = new ToolCapabilities(
            SupportsClientExecution: executor.Metadata.CapabilityTags.Any(tag => tag.Equals("client-executable", StringComparison.OrdinalIgnoreCase)),
            SupportsStreaming: executor.Metadata.CapabilityTags.Any(tag => tag.Equals("streaming", StringComparison.OrdinalIgnoreCase)),
            IsCacheable: !executor.Metadata.CapabilityTags.Any(tag => tag.Equals("non-cacheable", StringComparison.OrdinalIgnoreCase)));

        return new ToolManifestV1(
            SchemaVersion: "1.0",
            Slug: slug,
            Name: executor.Metadata.Name,
            Description: executor.Metadata.Description,
            Category: executor.Metadata.Category,
            Actions: actions,
            Capabilities: capabilities);
    }
}
