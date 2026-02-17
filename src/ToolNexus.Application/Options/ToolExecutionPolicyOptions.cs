namespace ToolNexus.Application.Options;

public sealed class ToolExecutionPolicyOptions
{
    public const string SectionName = "ToolExecutionPolicies";

    public ToolExecutionPolicyDefinition Default { get; init; } = new();

    public Dictionary<string, ToolExecutionPolicyDefinition> Tools { get; init; } = new(StringComparer.OrdinalIgnoreCase);
}

public sealed class ToolExecutionPolicyDefinition
{
    public int TimeoutSeconds { get; init; } = 15;
    public int MaxPayloadSizeBytes { get; init; } = 512_000;
    public int CacheTtlSeconds { get; init; } = 300;
    public string AllowedHttpMethods { get; init; } = "GetOrPost";
    public bool AllowAnonymous { get; init; } = false;
    public int MaxConcurrency { get; init; } = 16;
    public int RetryCount { get; init; }
    public int CircuitBreakerFailureThreshold { get; init; } = 10;
    public bool Enabled { get; init; } = true;
}
