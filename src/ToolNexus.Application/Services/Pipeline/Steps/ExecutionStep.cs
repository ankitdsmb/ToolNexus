using ToolNexus.Application.Abstractions;
using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services.Pipeline.Steps;

public sealed class ExecutionStep(
    IApiToolExecutionStrategy strategy,
    IUniversalExecutionRequestMapper requestMapper) : IToolExecutionStep
{
    public const string RuntimeLanguageContextKey = "runtime.language";
    public const string AdapterNameContextKey = "runtime.adapterName";
    public const string AdapterResolutionStatusContextKey = "runtime.adapterResolutionStatus";

    public int Order => 500;

    public async Task<ToolExecutionResponse> InvokeAsync(ToolExecutionContext context, ToolExecutionDelegate next, CancellationToken cancellationToken)
    {
        if (context.Response is null)
        {
            var universalRequest = requestMapper.Map(context);
            var result = await strategy.ExecuteAsync(universalRequest, context.Policy, cancellationToken);
            context.Items[RuntimeLanguageContextKey] = result.Language.ToLegacyValue();
            context.Items[AdapterNameContextKey] = result.AdapterName;
            context.Items[AdapterResolutionStatusContextKey] = result.AdapterResolutionStatus;
            context.Response = result.Response;
        }

        return await next(context, cancellationToken);
    }
}
