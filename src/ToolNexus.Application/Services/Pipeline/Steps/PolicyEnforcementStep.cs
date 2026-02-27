using Microsoft.AspNetCore.Http;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Application.Services.Policies;
using static ToolNexus.Application.Services.Pipeline.UniversalExecutionEngine;

namespace ToolNexus.Application.Services.Pipeline.Steps;

public sealed class PolicyEnforcementStep(IHttpContextAccessor accessor, IApiKeyValidator apiKeyValidator, IToolExecutionRateGuard rateGuard) : IToolExecutionStep
{
    public int Order => 200;

    public async Task<ToolExecutionResponse> InvokeAsync(ToolExecutionContext context, ToolExecutionDelegate next, CancellationToken cancellationToken)
    {
        var policy = context.Policy;
        if (policy is null)
        {
            return await Deny(context, next, cancellationToken, "Execution policy could not be resolved.", "policy_denied", "policy_missing");
        }

        if (!policy.IsExecutionEnabled || policy.ExecutionMode.Equals("Disabled", StringComparison.OrdinalIgnoreCase))
        {
            return await Deny(context, next, cancellationToken, "Execution is disabled for this tool.", "policy_denied", "execution_disabled");
        }

        if (policy.TimeoutSeconds <= 0)
        {
            return await Deny(context, next, cancellationToken, "Execution timeout policy is invalid.", "policy_denied", "invalid_timeout");
        }

        var payloadBytes = System.Text.Encoding.UTF8.GetByteCount(context.Input);
        if (payloadBytes > policy.MaxInputSize)
        {
            return await Deny(context, next, cancellationToken, "Input exceeds allowed tool payload size.", "policy_denied", "payload_too_large");
        }

        if (!rateGuard.TryAcquire(context.ToolId, policy.MaxRequestsPerMinute))
        {
            return await Deny(context, next, cancellationToken, "Tool rate limit exceeded.", "policy_denied", "rate_limited");
        }

        var method = accessor.HttpContext?.Request.Method;
        if (!string.IsNullOrWhiteSpace(method) &&
            ((HttpMethods.IsGet(method) && !policy.AllowedHttpMethods.HasFlag(ToolHttpMethodPolicy.Get)) ||
             (HttpMethods.IsPost(method) && !policy.AllowedHttpMethods.HasFlag(ToolHttpMethodPolicy.Post))))
        {
            return await Deny(context, next, cancellationToken, "HTTP method is not allowed for this tool.", "policy_denied", "http_method_denied");
        }

        if (!policy.AllowAnonymous)
        {
            var key = accessor.HttpContext?.Request.Headers["X-API-KEY"].FirstOrDefault();
            if (string.IsNullOrWhiteSpace(key) || !apiKeyValidator.IsValid(key.AsSpan()))
            {
                return await Deny(context, next, cancellationToken, "API key is required.", "policy_denied", "api_key_required");
            }
        }

        await next(context, cancellationToken);
        return context.Response!;
    }

    private static async Task<ToolExecutionResponse> Deny(
        ToolExecutionContext context,
        ToolExecutionDelegate next,
        CancellationToken cancellationToken,
        string message,
        string conformanceStatus,
        string issueCode)
    {
        context.Response = new ToolExecutionResponse(false, string.Empty, message);
        context.Items[AdapterResolutionStatusContextKey] = "policy_denied";
        context.Items[ConformanceValidContextKey] = "false";
        context.Items[ConformanceNormalizedContextKey] = "true";
        context.Items[ConformanceIssueCountContextKey] = "1";
        context.Items[ConformanceStatusContextKey] = conformanceStatus;
        context.Items[ConformanceIssuesContextKey] = $"[\"{issueCode}\"]";
        await next(context, cancellationToken);
        return context.Response!;
    }

}
