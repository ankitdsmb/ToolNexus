using ToolNexus.Application.Models;
using ToolNexus.Application.Services.Policies;

namespace ToolNexus.Application.Services.Pipeline.Steps;

public sealed class ValidationStep(IToolManifestGovernance governance, IToolExecutionPolicyRegistry policyRegistry) : IToolExecutionStep
{
    public int Order => 100;

    public async Task<ToolExecutionResponse> InvokeAsync(ToolExecutionContext context, ToolExecutionDelegate next, CancellationToken cancellationToken)
    {
        var manifest = governance.FindBySlug(context.ToolId);
        if (manifest is null)
        {
            return Task.FromResult(new ToolExecutionResponse(false, string.Empty, $"Tool '{context.ToolId}' not found.", true));
        }

        if (!manifest.SupportedActions.Contains(context.Action, StringComparer.OrdinalIgnoreCase))
        {
            return Task.FromResult(new ToolExecutionResponse(false, string.Empty, "Action is not supported for this tool."));
        }

        context.Manifest = manifest;
        context.Policy = await policyRegistry.GetPolicyAsync(context.ToolId, cancellationToken);
        return await next(context, cancellationToken);
    }
}
