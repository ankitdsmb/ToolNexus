using ToolNexus.Application.Models;
using ToolNexus.Domain;

namespace ToolNexus.Application.Services;

public sealed class ToolService(
    IToolExecutionClient executionClient,
    IToolResponseCache responseCache) : IToolService
{
    public async Task<ToolExecutionResponse> ExecuteAsync(ToolExecutionRequest request, CancellationToken cancellationToken = default)
    {
        var validationError = Validate(request);
        if (validationError is not null)
        {
            return validationError;
        }

        var normalizedSlug = request!.Slug.Trim().ToLowerInvariant();
        var normalizedAction = request.Action.Trim().ToLowerInvariant();

        var cachedResponse = await responseCache.GetAsync(normalizedSlug, normalizedAction, request.Input, cancellationToken);
        if (cachedResponse is not null)
        {
            return cachedResponse;
        }

        var options = request.Options is null
            ? null
            : new Dictionary<string, string>(request.Options, StringComparer.OrdinalIgnoreCase);

        var clientResult = await executionClient.ExecuteAsync(
            normalizedSlug,
            new ToolRequest(normalizedAction, request.Input, options),
            cancellationToken);

        if (!clientResult.Found)
        {
            return new ToolExecutionResponse(false, string.Empty, $"Tool '{request.Slug}' not found.", true);
        }

        var result = clientResult.Result!;
        var response = new ToolExecutionResponse(result.Success, result.Output, result.Error);

        if (response.Success)
        {
            await responseCache.SetAsync(normalizedSlug, normalizedAction, request.Input, response, cancellationToken);
        }

        return response;
    }

    private static ToolExecutionResponse? Validate(ToolExecutionRequest? request)
    {
        if (request is null)
        {
            return new ToolExecutionResponse(false, string.Empty, "Request is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Slug))
        {
            return new ToolExecutionResponse(false, string.Empty, "Tool slug is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Action))
        {
            return new ToolExecutionResponse(false, string.Empty, "Action is required.");
        }

        if (request.Input is null)
        {
            return new ToolExecutionResponse(false, string.Empty, "Input is required.");
        }

        return null;
    }
}
