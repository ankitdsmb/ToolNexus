using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;

namespace ToolNexus.Web.Services;

public sealed class ToolManifestLoader(ILogger<ToolManifestLoader> logger, IWebHostEnvironment hostEnvironment) : IToolManifestLoader
{
    private const string MonacoLoaderPath = "/lib/monaco/vs/loader.js";

    private static readonly JsonSerializerOptions SerializerOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        WriteIndented = true
    };

    private static readonly HashSet<string> ReservedViewNames = ["Index", "Category", "Tool", "ToolShell"];

    private readonly string contentRootPath = hostEnvironment.ContentRootPath;
    private readonly string webRootPath = string.IsNullOrWhiteSpace(hostEnvironment.WebRootPath)
        ? Path.Combine(hostEnvironment.ContentRootPath, "wwwroot")
        : hostEnvironment.WebRootPath;
    private readonly string manifestDirectory = Path.Combine(hostEnvironment.ContentRootPath, "App_Data", "tool-manifests");
    private readonly string viewDirectory = Path.Combine(hostEnvironment.ContentRootPath, "Views", "Tools");
    private readonly string templateDirectory = Path.Combine(string.IsNullOrWhiteSpace(hostEnvironment.WebRootPath) ? Path.Combine(hostEnvironment.ContentRootPath, "wwwroot") : hostEnvironment.WebRootPath, "tool-templates");

    public IReadOnlyCollection<ToolManifest> LoadAll()
    {
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

        return manifests.OrderBy(x => x.Slug, StringComparer.OrdinalIgnoreCase).ToArray();
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
            Category = manifest.Category
        };
    }

    private string[] NormalizeDependencies(string[]? dependencies, string slug)
    {
        var normalized = (dependencies ?? [])
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => NormalizeWebPath(x.Trim()))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (slug.Contains("json-formatter", StringComparison.OrdinalIgnoreCase)
            && normalized.All(x => !string.Equals(x, MonacoLoaderPath, StringComparison.OrdinalIgnoreCase))
            && IsExistingWebAssetPath(MonacoLoaderPath))
        {
            normalized.Add(MonacoLoaderPath);
        }

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

        if (slug.Contains("json-formatter", StringComparison.OrdinalIgnoreCase)
            && filtered.All(x => !string.Equals(x, MonacoLoaderPath, StringComparison.OrdinalIgnoreCase)))
        {
            logger.LogWarning("Monaco loader is unavailable for '{ToolSlug}'. Runtime will continue without Monaco dependency.", slug);
        }

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

        var normalized = NormalizeWebPath(path);
        var localPath = Path.Combine(webRootPath, normalized.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
        return File.Exists(localPath);
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
        var modulePath = $"/js/tools/{toolView.Slug}.js";
        var nestedModulePath = $"/js/tools/{toolView.Slug}/main.js";
        if (File.Exists(Path.Combine(contentRootPath, "wwwroot", nestedModulePath.TrimStart('/').Replace('/', Path.DirectorySeparatorChar))))
        {
            modulePath = nestedModulePath;
        }

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
            Category = string.Empty
        };
    }

    private void PersistManifest(ToolManifest manifest)
    {
        var manifestPath = Path.Combine(manifestDirectory, $"{manifest.Slug}.json");
        var json = JsonSerializer.Serialize(manifest, SerializerOptions);
        File.WriteAllText(manifestPath, json + Environment.NewLine);
    }

    private void EnsureTemplate(ToolManifest manifest)
    {
        var templatePath = Path.Combine(templateDirectory, $"{manifest.Slug}.html");
        if (File.Exists(templatePath))
        {
            return;
        }

        var viewPath = Path.Combine(viewDirectory, $"{manifest.ViewName}.cshtml");
        if (!File.Exists(viewPath))
        {
            logger.LogWarning("Missing source view for tool template generation: {ViewPath}", viewPath);
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

    private static string ToSlug(string viewName)
    {
        var value = viewName
            .Replace("json2", "json-to-", StringComparison.OrdinalIgnoreCase)
            .Replace("Json2", "JsonTo", StringComparison.Ordinal);

        value = Regex.Replace(value, "([a-z0-9])([A-Z])", "$1-$2");
        value = value.Replace("_", "-");

        return value.ToLowerInvariant();
    }
}
