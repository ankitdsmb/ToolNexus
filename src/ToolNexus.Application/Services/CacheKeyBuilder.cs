using System.Security.Cryptography;
using System.Text;

namespace ToolNexus.Application.Services;

/// <summary>
/// Builds deterministic cache keys from normalized tool inputs.
/// </summary>
public static class CacheKeyBuilder
{
    public static string Build(string toolId, string action, string input, IReadOnlyDictionary<string, string> options)
    {
        var normalizedToolId = Normalize(toolId);
        var normalizedAction = Normalize(action);
        var normalizedInput = NormalizeInput(input);
        var normalizedOptions = NormalizeOptions(options);
        var payload = $"{normalizedToolId}\n{normalizedAction}\n{normalizedInput}\n{normalizedOptions}";

        var hashBytes = SHA256.HashData(Encoding.UTF8.GetBytes(payload));
        return Convert.ToHexString(hashBytes).ToLowerInvariant();
    }

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
}
