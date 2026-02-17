using System.Security.Cryptography;
using System.Text;

namespace ToolNexus.Application.Services;

/// <summary>
/// Builds deterministic SHA-256 cache keys from normalized tool inputs + options.
/// The class is stateless and thread-safe.
/// </summary>
public sealed class CacheKeyBuilder
{
    public static string Build(string toolId, string action, string input, IReadOnlyDictionary<string, string> options)
        => BuildCore(toolId, action, input, options);

    // Allows callers to provide inputs that are already normalized upstream without duplicating logic.
    public string BuildFromNormalized(string normalizedToolId, string normalizedAction, string normalizedInput, IReadOnlyDictionary<string, string> normalizedOptions)
        => BuildCore(normalizedToolId, normalizedAction, normalizedInput, normalizedOptions, alreadyNormalized: true);

    private static string BuildCore(
        string toolId,
        string action,
        string input,
        IReadOnlyDictionary<string, string> options,
        bool alreadyNormalized = false)
    {
        var normalizedToolId = alreadyNormalized ? NullToEmpty(toolId) : Normalize(toolId);
        var normalizedAction = alreadyNormalized ? NullToEmpty(action) : Normalize(action);
        var normalizedInput = alreadyNormalized ? NullToEmpty(input) : NormalizeInput(input);
        var normalizedOptions = alreadyNormalized ? NormalizeOptionsPreservingValues(options) : NormalizeOptions(options);
        var payload = $"{normalizedToolId}\n{normalizedAction}\n{normalizedInput}\n{normalizedOptions}";

        var hashBytes = SHA256.HashData(Encoding.UTF8.GetBytes(payload));
        return Convert.ToHexString(hashBytes).ToLowerInvariant();
    }

    private static string NullToEmpty(string value) => value ?? string.Empty;

    private static string Normalize(string value) => (value ?? string.Empty).Trim().ToLowerInvariant();

    private static string NormalizeInput(string input) => (input ?? string.Empty).Trim();

    private static string NormalizeOptions(IReadOnlyDictionary<string, string> options)
    {
        if (options.Count == 0)
        {
            return string.Empty;
        }

        return string.Join(
            "&",
            options
                .OrderBy(x => x.Key, StringComparer.Ordinal)
                .ThenBy(x => x.Value, StringComparer.Ordinal)
                .Select(kvp => $"{Normalize(kvp.Key)}={Normalize(kvp.Value)}"));
    }

    private static string NormalizeOptionsPreservingValues(IReadOnlyDictionary<string, string> options)
    {
        if (options.Count == 0)
        {
            return string.Empty;
        }

        return string.Join(
            "&",
            options
                .OrderBy(x => x.Key, StringComparer.Ordinal)
                .ThenBy(x => x.Value, StringComparer.Ordinal)
                .Select(kvp => $"{NullToEmpty(kvp.Key)}={NullToEmpty(kvp.Value)}"));
    }
}
