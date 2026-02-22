using Microsoft.AspNetCore.Http;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Application.Services.Policies;

namespace ToolNexus.Application.Services.Pipeline.Steps;

public sealed class PolicyEnforcementStep(IHttpContextAccessor accessor, IApiKeyValidator apiKeyValidator, IToolExecutionRateGuard rateGuard) : IToolExecutionStep
{
    public int Order => 200;

    public Task<ToolExecutionResponse> InvokeAsync(ToolExecutionContext context, ToolExecutionDelegate next, CancellationToken cancellationToken)
    {
        var policy = context.Policy;
        if (policy is null)
        {
            return Task.FromResult(new ToolExecutionResponse(false, string.Empty, "Execution policy could not be resolved."));
        }

        if (!policy.IsExecutionEnabled || policy.ExecutionMode.Equals("Disabled", StringComparison.OrdinalIgnoreCase))
        {
            return Task.FromResult(new ToolExecutionResponse(false, string.Empty, "Execution is disabled for this tool."));
        }

        if (policy.TimeoutSeconds <= 0)
        {
            return Task.FromResult(new ToolExecutionResponse(false, string.Empty, "Execution timeout policy is invalid."));
        }

        var payloadBytes = System.Text.Encoding.UTF8.GetByteCount(context.Input);
        if (payloadBytes > policy.MaxInputSize)
        {
            return Task.FromResult(new ToolExecutionResponse(false, string.Empty, "Input exceeds allowed tool payload size."));
        }

        if (!rateGuard.TryAcquire(context.ToolId, policy.MaxRequestsPerMinute))
        {
            return Task.FromResult(new ToolExecutionResponse(false, string.Empty, "Tool rate limit exceeded."));
        }

        var method = accessor.HttpContext?.Request.Method;
        if (!string.IsNullOrWhiteSpace(method) &&
            ((HttpMethods.IsGet(method) && !policy.AllowedHttpMethods.HasFlag(ToolHttpMethodPolicy.Get)) ||
             (HttpMethods.IsPost(method) && !policy.AllowedHttpMethods.HasFlag(ToolHttpMethodPolicy.Post))))
        {
            return Task.FromResult(new ToolExecutionResponse(false, string.Empty, "HTTP method is not allowed for this tool."));
        }

        if (!policy.AllowAnonymous)
        {
            var key = accessor.HttpContext?.Request.Headers["X-API-KEY"].FirstOrDefault();
            if (string.IsNullOrWhiteSpace(key) || !apiKeyValidator.IsValid(key.AsSpan()))
            {
                return Task.FromResult(new ToolExecutionResponse(false, string.Empty, "API key is required."));
            }
        }

        return next(context, cancellationToken);
    }
}
