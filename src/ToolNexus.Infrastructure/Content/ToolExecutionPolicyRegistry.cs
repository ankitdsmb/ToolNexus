using Microsoft.Extensions.Options;
using ToolNexus.Application.Options;
using ToolNexus.Application.Services;
using ToolNexus.Application.Services.Policies;

namespace ToolNexus.Infrastructure.Content;

public sealed class ToolExecutionPolicyRegistry(
    IOptions<ToolExecutionPolicyOptions> options,
    IExecutionPolicyService executionPolicyService) : IToolExecutionPolicyRegistry
{
    private readonly Dictionary<string, ToolExecutionPolicyDefinition> _definitions = options.Value.Tools;
    private readonly ToolExecutionPolicyDefinition _default = options.Value.Default;

    public async Task<IToolExecutionPolicy> GetPolicyAsync(string slug, CancellationToken cancellationToken = default)
    {
        var runtime = await executionPolicyService.GetBySlugAsync(slug, cancellationToken);
        var legacy = _definitions.TryGetValue(slug, out var definition) ? definition : _default;

        Enum.TryParse<ToolHttpMethodPolicy>(legacy.AllowedHttpMethods, true, out var methods);
        if (methods == ToolHttpMethodPolicy.None)
        {
            methods = ToolHttpMethodPolicy.GetOrPost;
        }

        return new ToolExecutionPolicy(
            slug,
            runtime.ExecutionMode,
            runtime.IsExecutionEnabled,
            Math.Max(1, runtime.TimeoutSeconds),
            Math.Max(512, runtime.MaxInputSize),
            Math.Max(1, runtime.MaxRequestsPerMinute),
            Math.Max(1, legacy.CacheTtlSeconds),
            methods,
            legacy.AllowAnonymous,
            Math.Max(1, legacy.MaxConcurrency),
            Math.Max(0, legacy.RetryCount),
            Math.Max(1, legacy.CircuitBreakerFailureThreshold));
    }
}
