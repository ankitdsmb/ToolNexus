namespace ToolNexus.Application.Models;

/// <summary>
/// Universal execution result that preserves the existing response contract and
/// adds cross-language execution metadata.
/// </summary>
public sealed record UniversalToolExecutionResult(
    bool Success,
    string Output,
    string? Error,
    bool NotFound,
    string ToolId,
    string ToolVersion,
    string Language,
    string Operation,
    string? ExecutionPolicyId,
    string? ResourceClass,
    int DurationMs,
    string? TenantId,
    string? CorrelationId,
    ToolInsightResult? Insight = null)
{
    public ToolExecutionResponse ToToolExecutionResponse()
    {
        return new ToolExecutionResponse(Success, Output, Error, NotFound, Insight);
    }

    public static UniversalToolExecutionResult FromToolExecutionResponse(
        ToolExecutionResponse response,
        UniversalToolExecutionRequest request,
        int durationMs)
    {
        return new UniversalToolExecutionResult(
            response.Success,
            response.Output,
            response.Error,
            response.NotFound,
            request.ToolId,
            request.ToolVersion,
            request.Language,
            request.Operation,
            request.ExecutionPolicyId,
            request.ResourceClass,
            durationMs,
            request.TenantId,
            request.CorrelationId,
            response.Insight);
    }
}
