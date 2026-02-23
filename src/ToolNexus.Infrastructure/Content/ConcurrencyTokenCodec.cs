namespace ToolNexus.Infrastructure.Content;

internal static class ConcurrencyTokenCodec
{
    public static string? Encode(byte[]? token)
        => token is { Length: > 0 } ? Convert.ToBase64String(token) : null;

    public static byte[] NewToken()
        => Guid.NewGuid().ToByteArray();
}
