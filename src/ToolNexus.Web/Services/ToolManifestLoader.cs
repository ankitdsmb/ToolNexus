using System.Collections.Concurrent;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;

namespace ToolNexus.Web.Services;

public sealed class ToolManifestLoader(ILogger<ToolManifestLoader> logger, IWebHostEnvironment hostEnvironment) : IToolManifestLoader
{
    private static readonly JsonSerializerOptions SerializerOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        WriteIndented = true
    };

    private static readonly HashSet<string> ReservedViewNames = ["Index", "Category", "Tool", "ToolShell"];

    private readonly string contentRootPath = hostEnvironment.ContentRootPath;
    private readonly object loadLock = new();
    private readonly ConcurrentDictionary<string, bool> webAssetPathCache = new(StringComparer.OrdinalIgnoreCase);
    private IReadOnlyCollection<ToolManifest>? cachedManifests;
    private readonly string webRootPath = string.IsNullOrWhiteSpace(hostEnvironment.WebRootPath)
        ? Path.Combine(hostEnvironment.ContentRootPath, "wwwroot")
        : hostEnvironment.WebRootPath;
    private readonly string manifestDirectory = Path.Combine(hostEnvironment.ContentRootPath, "App_Data", "tool-manifests");
    private readonly string viewDirectory = Path.Combine(hostEnvironment.ContentRootPath, "Views", "Tools");
    private readonly string templateDirectory = Path.Combine(string.IsNullOrWhiteSpace(hostEnvironment.WebRootPath) ? Path.Combine(hostEnvironment.ContentRootPath, "wwwroot") : hostEnvironment.WebRootPath, "tool-templates");
    private readonly string? platformManifestPath = ResolvePlatformManifestPath(hostEnvironment.ContentRootPath);

    public IReadOnlyCollection<ToolManifest> LoadAll()
    {
        if (cachedManifests is not null)
        {
            return cachedManifests;
        }

        lock (loadLock)
        {
            if (cachedManifests is not null)
            {
                return cachedManifests;
            }

            Directory.CreateDirectory(manifestDirectory);
            Directory.CreateDirectory(templateDirectory);

            var manifests = new List<ToolManifest>();
            var seenSlugs = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (var filePath in Directory.EnumerateFiles(manifestDirectory, "*.json").OrderBy(path => path, StringComparer.OrdinalIgnoreCase))
            {
                ToolManifest? manifest;

                try
                {
                    var json = File.ReadAllText(filePath);
                    manifest = JsonSerializer.Deserialize<ToolManifest>(json, SerializerOptions);
                }
                catch (JsonException ex)
                {
                    logger.LogWarning(ex, "Skipping invalid tool manifest JSON file: {ManifestFile}", filePath);
                    continue;
                }
                catch (IOException ex)
                {
                    logger.LogWarning(ex, "Skipping unreadable tool manifest file: {ManifestFile}", filePath);
                    continue;
                }

                if (manifest is null || string.IsNullOrWhiteSpace(manifest.Slug) || string.IsNullOrWhiteSpace(manifest.ViewName))
                {
                    logger.LogWarning("Skipping invalid tool manifest missing required fields: {ManifestFile}", filePath);
                    continue;
                }

                var normalized = NormalizeManifest(manifest);
                if (!seenSlugs.Add(normalized.Slug))
                {
                    throw new InvalidOperationException($"Duplicate tool manifest slug detected: '{normalized.Slug}'.");
                }

                EnsureTemplate(normalized);
                manifests.Add(normalized);
            }

            foreach (var discovered in DiscoverToolViews())
            {
                if (seenSlugs.Contains(discovered.Slug))
                {
                    continue;
                }

                var generated = BuildGeneratedManifest(discovered);
                PersistManifest(generated);
                EnsureTemplate(generated);
                manifests.Add(generated);
                seenSlugs.Add(generated.Slug);
                logger.LogInformation("Generated missing manifest for tool slug '{ToolSlug}'.", generated.Slug);
            }

            foreach (var discovered in DiscoverPlatformManifestTools())
            {
                if (seenSlugs.Contains(discovered.Slug))
                {
                    continue;
                }

                var generated = BuildGeneratedManifest(discovered);
                PersistManifest(generated);
                EnsureTemplate(generated);
                manifests.Add(generated);
                seenSlugs.Add(generated.Slug);
                logger.LogInformation("Generated missing platform manifest for tool slug '{ToolSlug}'.", generated.Slug);
            }

            cachedManifests = manifests.OrderBy(x => x.Slug, StringComparer.OrdinalIgnoreCase).ToArray();
            return cachedManifests;
        }
    }

    private ToolManifest NormalizeManifest(ToolManifest manifest)
    {
        var slug = manifest.Slug.Trim();
        var normalizedDependencies = NormalizeDependencies(manifest.Dependencies, slug);
        var normalizedStyles = NormalizeStyles(manifest.Styles, manifest.CssPath, slug);

        return new ToolManifest
        {
            Slug = slug,
            ViewName = manifest.ViewName,
            ModulePath = NormalizeWebPath(string.IsNullOrWhiteSpace(manifest.ModulePath) ? $"/js/tools/{slug}.js" : manifest.ModulePath.Trim()),
            TemplatePath = NormalizeWebPath(string.IsNullOrWhiteSpace(manifest.TemplatePath) ? $"/tool-templates/{slug}.html" : manifest.TemplatePath.Trim()),
            Dependencies = normalizedDependencies,
            Styles = normalizedStyles,
            CssPath = normalizedStyles.FirstOrDefault(),
            Category = manifest.Category,
            UiMode = NormalizeUiMode(manifest.UiMode),
            ComplexityTier = NormalizeComplexityTier(manifest.ComplexityTier)
        };
    }

    private string NormalizeUiMode(string? uiMode)
    {
        if (string.Equals(uiMode, "custom", StringComparison.OrdinalIgnoreCase))
        {
            return "custom";
        }

        return "auto";
    }

    private static int NormalizeComplexityTier(int complexityTier)
    {
        return Math.Clamp(complexityTier <= 0 ? 1 : complexityTier, 1, 5);
    }

    private string[] NormalizeDependencies(string[]? dependencies, string slug)
    {
        var normalized = (dependencies ?? [])
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => NormalizeWebPath(x.Trim()))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        var filtered = normalized
            .Where(path =>
            {
                if (IsExistingWebAssetPath(path))
                {
                    return true;
                }

                logger.LogWarning("Removing missing dependency '{DependencyPath}' for tool '{ToolSlug}'.", path, slug);
                return false;
            })
            .ToArray();

        return filtered;
    }

    private string[] NormalizeStyles(string[]? styles, string? cssPath, string slug)
    {
        var merged = new List<string>();
        if (styles is { Length: > 0 })
        {
            merged.AddRange(styles);
        }

        if (!string.IsNullOrWhiteSpace(cssPath))
        {
            merged.Add(cssPath);
        }

        return merged
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => NormalizeWebPath(x.Trim()))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Where(path =>
            {
                if (IsExistingWebAssetPath(path))
                {
                    return true;
                }

                logger.LogWarning("Removing missing stylesheet '{StylesheetPath}' for tool '{ToolSlug}'.", path, slug);
                return false;
            })
            .ToArray();
    }

    private static string NormalizeWebPath(string path)
    {
        if (string.IsNullOrWhiteSpace(path))
        {
            return path;
        }

        var normalized = path.Trim();

        if (normalized.StartsWith("http://", StringComparison.OrdinalIgnoreCase)
            || normalized.StartsWith("https://", StringComparison.OrdinalIgnoreCase)
            || normalized.StartsWith("//", StringComparison.OrdinalIgnoreCase))
        {
            return normalized;
        }

        if (!normalized.StartsWith('/'))
        {
            normalized = $"/{normalized}";
        }

        return normalized.Replace('\\', '/');
    }

    private bool IsExistingWebAssetPath(string path)
    {
        if (string.IsNullOrWhiteSpace(path))
        {
            return false;
        }

        if (path.StartsWith("http://", StringComparison.OrdinalIgnoreCase)
            || path.StartsWith("https://", StringComparison.OrdinalIgnoreCase)
            || path.StartsWith("//", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        var normalized = NormalizeWebPath(path);
        return webAssetPathCache.GetOrAdd(normalized, static (assetPath, root) =>
        {
            var localPath = Path.Combine(root, assetPath.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
            return File.Exists(localPath);
        }, webRootPath);
    }

    private IEnumerable<(string ViewName, string Slug, string ViewPath)> DiscoverToolViews()
    {
        if (!Directory.Exists(viewDirectory))
        {
            yield break;
        }

        foreach (var filePath in Directory.EnumerateFiles(viewDirectory, "*.cshtml").OrderBy(path => path, StringComparer.OrdinalIgnoreCase))
        {
            var viewName = Path.GetFileNameWithoutExtension(filePath);
            if (ReservedViewNames.Contains(viewName))
            {
                continue;
            }

            yield return (viewName, ToSlug(viewName), filePath);
        }
    }

    private ToolManifest BuildGeneratedManifest((string ViewName, string Slug, string ViewPath) toolView)
    {
        var modulePath = ResolveModulePath(toolView.Slug);

        var styles = new[]
        {
            $"/css/tools/{toolView.Slug}.css",
            $"/css/pages/{toolView.Slug}.css"
        }
        .Where(IsExistingWebAssetPath)
        .Take(1)
        .ToArray();

        return new ToolManifest
        {
            Slug = toolView.Slug,
            ViewName = toolView.ViewName,
            ModulePath = modulePath,
            TemplatePath = $"/tool-templates/{toolView.Slug}.html",
            Dependencies = NormalizeDependencies([], toolView.Slug),
            Styles = styles,
            CssPath = styles.FirstOrDefault(),
            Category = string.Empty,
            UiMode = "auto",
            ComplexityTier = 1
        };
    }

    private void PersistManifest(ToolManifest manifest)
    {
        var manifestPath = Path.Combine(manifestDirectory, $"{manifest.Slug}.json");
        var json = JsonSerializer.Serialize(manifest, SerializerOptions);
        File.WriteAllText(manifestPath, json + Environment.NewLine);
    }

    private IEnumerable<(string ViewName, string Slug, string ViewPath)> DiscoverPlatformManifestTools()
    {
        if (string.IsNullOrWhiteSpace(platformManifestPath) || !File.Exists(platformManifestPath))
        {
            yield break;
        }

        PlatformManifest? parsedManifest;
        try
        {
            parsedManifest = JsonSerializer.Deserialize<PlatformManifest>(File.ReadAllText(platformManifestPath), SerializerOptions);
        }
        catch (JsonException ex)
        {
            logger.LogWarning(ex, "Skipping invalid platform manifest JSON file: {PlatformManifestPath}", platformManifestPath);
            yield break;
        }

        if (parsedManifest?.Tools is not { Count: > 0 })
        {
            yield break;
        }

        foreach (var tool in parsedManifest.Tools)
        {
            if (string.IsNullOrWhiteSpace(tool.Slug))
            {
                continue;
            }

            yield return ("ToolShell", tool.Slug.Trim(), string.Empty);
        }
    }

    private void EnsureTemplate(ToolManifest manifest)
    {
        var templatePath = Path.Combine(templateDirectory, $"{manifest.Slug}.html");
        if (File.Exists(templatePath))
        {
            return;
        }

        if (string.Equals(manifest.ViewName, "ToolShell", StringComparison.OrdinalIgnoreCase))
        {
            File.WriteAllText(templatePath, BuildGenericTemplate(manifest.Slug) + Environment.NewLine, Encoding.UTF8);
            logger.LogInformation("Generated generic runtime template for slug '{ToolSlug}'.", manifest.Slug);
            return;
        }

        var viewPath = Path.Combine(viewDirectory, $"{manifest.ViewName}.cshtml");
        if (!File.Exists(viewPath))
        {
            logger.LogWarning("Missing source view for tool template generation: {ViewPath}. Runtime will use lifecycle fallback for '{ToolSlug}'.", viewPath, manifest.Slug);
            return;
        }

        var viewMarkup = File.ReadAllText(viewPath);
        var template = ExtractTemplateMarkup(viewMarkup);
        File.WriteAllText(templatePath, template + Environment.NewLine, Encoding.UTF8);
        logger.LogInformation("Generated missing tool template for slug '{ToolSlug}'.", manifest.Slug);
    }

    private static string ExtractTemplateMarkup(string razor)
    {
        var withoutSections = Regex.Replace(razor, @"@section\s+\w+\s*\{[\s\S]*?\}", string.Empty, RegexOptions.Multiline);
        var withoutCodeBlocks = Regex.Replace(withoutSections, "@\\{[\\s\\S]*?\\}", string.Empty, RegexOptions.Multiline);
        var withoutIfBlocks = Regex.Replace(withoutCodeBlocks, "@if\\s*\\([\\s\\S]*?\\)\\s*\\{[\\s\\S]*?\\}", string.Empty, RegexOptions.Multiline);
        var withoutForeach = Regex.Replace(withoutIfBlocks, "@foreach\\s*\\([\\s\\S]*?\\)\\s*\\{[\\s\\S]*?\\}", string.Empty, RegexOptions.Multiline);
        var noTokens = Regex.Replace(withoutForeach, "@[A-Za-z0-9_\\.]+", string.Empty);

        var lines = noTokens
            .Split('\n')
            .Select(line => line.TrimEnd())
            .Where(line =>
            {
                var trimmed = line.TrimStart();
                if (trimmed.StartsWith("@", StringComparison.Ordinal))
                {
                    return false;
                }

                return trimmed.Length == 0 || trimmed.StartsWith('<');
            })
            .ToArray();

        return string.Join('\n', lines).Trim();
    }

    private static string BuildGenericTemplate(string slug)
    {
        return $"<section class=\"tool-generic-template\" data-tool-slug=\"{slug}\"><div class=\"tool-generic-template__body\">Loading {slug}...</div></section>";
    }

    private static string ToSlug(string viewName)
    {
        var value = viewName
            .Replace("json2", "json-to-", StringComparison.OrdinalIgnoreCase)
            .Replace("Json2", "JsonTo", StringComparison.Ordinal);

        value = Regex.Replace(value, "([a-z0-9])([A-Z])", "$1-$2");
        value = value.Replace("_", "-");

        return value.ToLowerInvariant();
    }

    private string ResolveModulePath(string slug)
    {
        foreach (var candidate in GetModuleCandidates(slug))
        {
            if (IsExistingWebAssetPath(candidate))
            {
                return candidate;
            }
        }

        return NormalizeWebPath($"/js/tools/{slug}.js");
    }

    private static IEnumerable<string> GetModuleCandidates(string slug)
    {
        yield return NormalizeWebPath($"/js/tools/{slug}.js");
        yield return NormalizeWebPath($"/js/tools/{slug}/main.js");
        yield return NormalizeWebPath($"/js/tools/{slug}/index.js");
        yield return NormalizeWebPath($"/js/tools/{slug}.app.js");
    }

    private static string? ResolvePlatformManifestPath(string contentRoot)
    {
        var directory = new DirectoryInfo(contentRoot);
        while (directory is not null)
        {
            var candidate = Path.Combine(directory.FullName, "tools.manifest.json");
            if (File.Exists(candidate))
            {
                return candidate;
            }

            directory = directory.Parent;
        }

        return null;
    }

    private sealed class PlatformManifest
    {
        public List<PlatformManifestTool> Tools { get; set; } = [];
    }

    private sealed class PlatformManifestTool
    {
        public string Slug { get; set; } = string.Empty;
    }
}
