using ToolNexus.Application.Models;
using ToolNexus.Application.Services.Policies;
using static ToolNexus.Application.Services.Pipeline.UniversalExecutionEngine;

namespace ToolNexus.Application.Services.Pipeline.Steps;

public sealed class ValidationStep(IToolManifestGovernance governance, IToolExecutionPolicyRegistry policyRegistry) : IToolExecutionStep
{
    public int Order => 100;

    public async Task<ToolExecutionResponse> InvokeAsync(ToolExecutionContext context, ToolExecutionDelegate next, CancellationToken cancellationToken)
    {
        var manifest = governance.FindBySlug(context.ToolId);
        if (manifest is null)
        {
            context.Response = new ToolExecutionResponse(false, string.Empty, $"Tool '{context.ToolId}' not found.", true);
            context.Items[AdapterResolutionStatusContextKey] = "validation_denied";
            context.Items[ConformanceValidContextKey] = "false";
            context.Items[ConformanceNormalizedContextKey] = "true";
            context.Items[ConformanceIssueCountContextKey] = "1";
            context.Items[ConformanceStatusContextKey] = "validation_denied";
            context.Items[ConformanceIssuesContextKey] = "[\"manifest_not_found\"]";
            await next(context, cancellationToken);
            return context.Response!;
        }

        if (!manifest.SupportedActions.Contains(context.Action, StringComparer.OrdinalIgnoreCase))
        {
            context.Response = new ToolExecutionResponse(false, string.Empty, "Action is not supported for this tool.");
            context.Items[AdapterResolutionStatusContextKey] = "validation_denied";
            context.Items[ConformanceValidContextKey] = "false";
            context.Items[ConformanceNormalizedContextKey] = "true";
            context.Items[ConformanceIssueCountContextKey] = "1";
            context.Items[ConformanceStatusContextKey] = "validation_denied";
            context.Items[ConformanceIssuesContextKey] = "[\"unsupported_action\"]";
            await next(context, cancellationToken);
            return context.Response!;
        }

        context.Manifest = manifest;
        context.Policy = await policyRegistry.GetPolicyAsync(context.ToolId, cancellationToken);
        return await next(context, cancellationToken);
    }
}
