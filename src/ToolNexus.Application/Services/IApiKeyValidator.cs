namespace ToolNexus.Application.Services;

public interface IApiKeyValidator
{
    bool IsValid(ReadOnlySpan<char> apiKey);
}
