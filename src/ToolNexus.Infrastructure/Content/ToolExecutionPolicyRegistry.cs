using Microsoft.Extensions.Options;
using ToolNexus.Application.Options;
using ToolNexus.Application.Services.Policies;

namespace ToolNexus.Infrastructure.Content;

public sealed class ToolExecutionPolicyRegistry(IOptions<ToolExecutionPolicyOptions> options) : IToolExecutionPolicyRegistry
{
    private readonly Dictionary<string, IToolExecutionPolicy> _policies = BuildPolicies(options.Value);

    public IToolExecutionPolicy GetPolicy(string slug)
    {
        if (_policies.TryGetValue(slug, out var policy))
        {
            return policy;
        }

        return _policies["*"];
    }

    private static Dictionary<string, IToolExecutionPolicy> BuildPolicies(ToolExecutionPolicyOptions options)
    {
        var result = new Dictionary<string, IToolExecutionPolicy>(StringComparer.OrdinalIgnoreCase)
        {
            ["*"] = BuildPolicy("*", options.Default)
        };

        foreach (var (slug, definition) in options.Tools)
        {
            result[slug] = BuildPolicy(slug, definition);
        }

        return result;
    }

    private static IToolExecutionPolicy BuildPolicy(string slug, ToolExecutionPolicyDefinition definition)
    {
        Enum.TryParse<ToolHttpMethodPolicy>(definition.AllowedHttpMethods, true, out var methods);
        if (methods == ToolHttpMethodPolicy.None)
        {
            methods = ToolHttpMethodPolicy.GetOrPost;
        }

        return new ToolExecutionPolicy(
            slug,
            Math.Max(1, definition.TimeoutSeconds),
            Math.Max(512, definition.MaxPayloadSizeBytes),
            Math.Max(1, definition.CacheTtlSeconds),
            methods,
            definition.AllowAnonymous,
            Math.Max(1, definition.MaxConcurrency),
            Math.Max(0, definition.RetryCount),
            Math.Max(1, definition.CircuitBreakerFailureThreshold));
    }
}
