using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using ToolNexus.Application.Services;
using ToolNexus.Infrastructure.Options;

namespace ToolNexus.Infrastructure.Security;

public sealed class ApiKeyValidator(IOptions<ApiKeyOptions> options) : IApiKeyValidator
{
    private readonly ApiKeyOptions _options = options.Value;
    private readonly byte[][] _keys = options.Value.Keys
        .Where(x => !string.IsNullOrWhiteSpace(x))
        .Select(x => Encoding.UTF8.GetBytes(x.Trim()))
        .ToArray();

    public bool IsValid(ReadOnlySpan<char> apiKey)
    {
        if (!_options.Enabled)
        {
            return true;
        }

        if (_keys.Length == 0 || apiKey.IsEmpty)
        {
            return false;
        }

        var provided = Encoding.UTF8.GetBytes(apiKey);
        try
        {
            foreach (var key in _keys)
            {
                if (provided.Length != key.Length)
                {
                    continue;
                }

                if (CryptographicOperations.FixedTimeEquals(provided, key))
                {
                    return true;
                }
            }

            return false;
        }
        finally
        {
            CryptographicOperations.ZeroMemory(provided);
        }
    }
}
