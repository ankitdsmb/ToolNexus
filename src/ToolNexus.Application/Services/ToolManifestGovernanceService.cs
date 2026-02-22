using System.Text.RegularExpressions;
using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public sealed class ToolManifestGovernanceService(IToolManifestRepository repository) : IToolManifestGovernance
{
    private static readonly Regex SlugRegex = new("^[a-z0-9]+(?:-[a-z0-9]+)*$", RegexOptions.Compiled);

    public IReadOnlyCollection<ToolManifest> GetAll() => ValidateAndBuild(repository.LoadTools());

    public ToolManifest? FindBySlug(string slug) =>
        ValidateAndBuild(repository.LoadTools()).FirstOrDefault(x => x.Slug.Equals(slug, StringComparison.OrdinalIgnoreCase));

    private static IReadOnlyCollection<ToolManifest> ValidateAndBuild(IReadOnlyCollection<ToolDescriptor> tools)
    {
        var duplicates = tools.GroupBy(x => x.Slug, StringComparer.OrdinalIgnoreCase).Where(g => g.Count() > 1).Select(g => g.Key).ToArray();
        if (duplicates.Length > 0)
        {
            throw new InvalidOperationException($"Duplicate tool slugs detected: {string.Join(", ", duplicates)}");
        }

        var manifests = new List<ToolManifest>(tools.Count);

        foreach (var tool in tools)
        {
            if (!SlugRegex.IsMatch(tool.Slug))
            {
                throw new InvalidOperationException($"Invalid slug format '{tool.Slug}'.");
            }

            if (tool.Actions.Count == 0)
            {
                throw new InvalidOperationException($"Tool '{tool.Slug}' must declare at least one action.");
            }

            var actions = tool.Actions.Select(x => x.Trim().ToLowerInvariant()).Distinct().ToArray();

            manifests.Add(new ToolManifest
            {
                Slug = tool.Slug,
                Version = tool.Version,
                Description = tool.SeoDescription,
                Category = tool.Category,
                SupportedActions = actions,
                IsDeterministic = tool.IsDeterministic,
                IsCpuIntensive = tool.IsCpuIntensive,
                IsCacheable = tool.IsCacheable,
                SecurityLevel = Enum.TryParse<ToolSecurityLevel>(tool.SecurityLevel, true, out var level) ? level : ToolSecurityLevel.Medium,
                RequiresAuthentication = tool.RequiresAuthentication,
                IsDeprecated = tool.IsDeprecated
            });
        }

        return manifests;
    }
}
