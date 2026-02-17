namespace ToolNexus.Application.Services.Policies;

public sealed record ToolExecutionPolicy(
    string Slug,
    int TimeoutSeconds,
    int MaxPayloadSizeBytes,
    int CacheTtlSeconds,
    ToolHttpMethodPolicy AllowedHttpMethods,
    bool AllowAnonymous,
    int MaxConcurrency,
    int RetryCount,
    int CircuitBreakerFailureThreshold) : IToolExecutionPolicy;
