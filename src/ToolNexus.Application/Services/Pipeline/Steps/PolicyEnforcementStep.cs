using Microsoft.AspNetCore.Http;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Application.Services.Policies;

namespace ToolNexus.Application.Services.Pipeline.Steps;

public sealed class PolicyEnforcementStep(IHttpContextAccessor accessor, IApiKeyValidator apiKeyValidator) : IToolExecutionStep
{
    public int Order => 200;

    public Task<ToolExecutionResponse> InvokeAsync(ToolExecutionContext context, ToolExecutionDelegate next, CancellationToken cancellationToken)
    {
        var policy = context.Policy;
        if (policy is null)
        {
            return Task.FromResult(new ToolExecutionResponse(false, string.Empty, "Execution policy could not be resolved."));
        }

        var payloadBytes = System.Text.Encoding.UTF8.GetByteCount(context.Input);
        if (payloadBytes > policy.MaxPayloadSizeBytes)
        {
            return Task.FromResult(new ToolExecutionResponse(false, string.Empty, "Input exceeds allowed tool payload size."));
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
            var isAuthenticated = accessor.HttpContext?.User?.Identity?.IsAuthenticated == true;
            var key = accessor.HttpContext?.Request.Headers["X-API-KEY"].FirstOrDefault();

            if (!isAuthenticated && (string.IsNullOrWhiteSpace(key) || !apiKeyValidator.IsValid(key.AsSpan())))
            {
                return Task.FromResult(new ToolExecutionResponse(false, string.Empty, "API key is required."));
            }
        }

        return next(context, cancellationToken);
    }
}
