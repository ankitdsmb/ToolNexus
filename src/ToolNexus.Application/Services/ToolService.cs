using Microsoft.Extensions.Logging;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services.Insights;
using ToolNexus.Application.Services.Pipeline;

namespace ToolNexus.Application.Services;

public sealed class ToolService(
    IToolExecutionPipeline executionPipeline,
    IToolInsightService insightService,
    ILogger<ToolService> logger) : IToolService
{
    public async Task<ToolExecutionResponse> ExecuteAsync(
        ToolExecutionRequest request,
        CancellationToken cancellationToken = default)
    {
        var validationError = Validate(request);
        if (validationError is not null)
        {
            return validationError;
        }

        var normalizedSlug = request!.Slug.Trim().ToLowerInvariant();
        var normalizedAction = request.Action.Trim().ToLowerInvariant();

        try
        {
            var response = await executionPipeline.ExecuteAsync(
                normalizedSlug,
                normalizedAction,
                request.Input,
                request.Options,
                cancellationToken);

            var insight = TryGetInsight(
                normalizedSlug,
                normalizedAction,
                request.Input,
                response.Error,
                request.Options,
                logger);

            return response with { Insight = insight };
        }
        catch (Exception ex)
        {
            logger.LogError(
                ex,
                "Unhandled tool execution error for tool {Slug} action {Action}.",
                normalizedSlug,
                normalizedAction);

            return new ToolExecutionResponse(
                false,
                string.Empty,
                "Tool execution failed unexpectedly.",
                false);
        }
    }

    private ToolInsightResult? TryGetInsight(
        string slug,
        string action,
        string input,
        string? error,
        IDictionary<string, string>? options,
        ILogger<ToolService> logger)
    {
        try
        {
            return insightService.GetInsight(slug, action, input, error, options);
        }
        catch (Exception ex)
        {
            logger.LogWarning(
                ex,
                "Insight generation failed for tool {Slug} action {Action}.",
                slug,
                action);

            return null;
        }
    }

    private static ToolExecutionResponse? Validate(ToolExecutionRequest? request)
    {
        if (request is null)
            return new ToolExecutionResponse(false, string.Empty, "Request is required.", false);

        if (string.IsNullOrWhiteSpace(request.Slug))
            return new ToolExecutionResponse(false, string.Empty, "Tool slug is required.", false);

        if (string.IsNullOrWhiteSpace(request.Action))
            return new ToolExecutionResponse(false, string.Empty, "Action is required.", false);

        if (request.Input is null)
            return new ToolExecutionResponse(false, string.Empty, "Input is required.", false);

        return null;
    }
}
