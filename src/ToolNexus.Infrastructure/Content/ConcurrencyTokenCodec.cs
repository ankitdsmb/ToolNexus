using System.ComponentModel.DataAnnotations;

namespace ToolNexus.Infrastructure.Content;

internal static class ConcurrencyTokenCodec
{
    public static string? Encode(byte[]? token)
        => token is { Length: > 0 } ? Convert.ToBase64String(token) : null;

    public static byte[] Decode(string token)
    {
        try
        {
            return Convert.FromBase64String(token);
        }
        catch (FormatException ex)
        {
            throw new ValidationException("VersionToken is invalid.", ex);
        }
    }

    public static byte[] NewToken()
        => Guid.NewGuid().ToByteArray();
}
